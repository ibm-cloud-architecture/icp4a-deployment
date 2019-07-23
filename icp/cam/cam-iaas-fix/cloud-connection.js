/*
*   Licensed Materials - Property of IBM
*   5737-E67
*   (C) Copyright IBM Corporation 2016-2019 All Rights Reserved.
*   US Government Users Restricted Rights - Use, duplication or
*   disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
var http_helper = require('@orpheus/orpheus-api-common').http_utils;
var AWS = require('aws-sdk');
var msRestAzure = require('ms-rest-azure');
var OSWrap = require('openstack-wrapper');
var querystring = require('querystring');
var log = require('@console/console-platform-log4js-utils').getLogger('cloudconnection');
var Promise = require('bluebird');
var swagger_constants = require('../utils/swagger-constants');
const async = require('async');
const datatypeutils = require('../utils/datatypeutils');
const errors = require('../errors/errors');
const proxy_utils =require('@orpheus/orpheus-api-common').proxy_utils;
const request = require('request').defaults({
  strictSSL: false,
  rejectUnauthorized: false,
});
const domain = require('domain');

Promise.promisifyAll(require('@orpheus/orpheus-api-common').http_utils);

const CONN_TIMEOUT = 120000;

// Connection parameters are an array of parameter objects
// Convert it into an object that is easily referencable
var formatConnection = function(conn) {
  var connection;
  if (conn) {
    connection = {};
    conn.forEach(element => {
      connection[element.name] = element.value;
    });
    return connection;
  }
};

module.exports = function(CloudConnection) {
  // Update fields of Cloud Connection connection parameters
  function updateConnectionParameters(cloudConnectionInstance, cloudConnectionInstanceExisting) {
    // Update existing connection parameters fields with new values
    if (cloudConnectionInstance.connection_parameters) {
      cloudConnectionInstance.connection_parameters.forEach(function(connectionParameterNew) {
        var matchingConnectionParameterExisting;
        if (cloudConnectionInstanceExisting.connection_parameters) {
          matchingConnectionParameterExisting = cloudConnectionInstanceExisting.connection_parameters.find(
            function(connectionParameterExisting) {
              return connectionParameterExisting.name === connectionParameterNew.name;
            });
        }
        if (matchingConnectionParameterExisting) {
          if ('value' in connectionParameterNew) {
            // Update the value if the new param passed in has one
            matchingConnectionParameterExisting.value = connectionParameterNew.value;
          }
        } else {
          cloudConnectionInstanceExisting.connection_parameters = (cloudConnectionInstanceExisting.connection_parameters || []);
          log.info('updateConnectionParameters NO MATCH ', connectionParameterNew.name);
          cloudConnectionInstanceExisting.connection_parameters.push(connectionParameterNew);
        }
      });
    }
    return cloudConnectionInstanceExisting.connection_parameters;
  }

  // Update fields of Cloud Connection configuration parameters
  function updateConfigurationParameters(cloudConnectionInstance, cloudConnectionInstanceExisting) {
    // Update existing configuration parameter fields with new values
    if (cloudConnectionInstance.configuration_parameters) {
      cloudConnectionInstance.configuration_parameters.forEach(function(configurationParameterNew) {
        var matchingConfigurationParameterExisting;
        if (cloudConnectionInstanceExisting.configuration_parameters) {
          matchingConfigurationParameterExisting = cloudConnectionInstanceExisting.configuration_parameters.find(
            function(configurationParameterExisting) {
              return configurationParameterExisting.name === configurationParameterNew.name;
            });
        }
        if (matchingConfigurationParameterExisting) {
          if ('value' in configurationParameterNew) {
            // Update the value if the new param passed in has one
            matchingConfigurationParameterExisting.value = configurationParameterNew.value;
          }
        } else {
          cloudConnectionInstance.configuration_parameters = (cloudConnectionInstance.configuration_parameters || []);
          log.info('updateConfigurationParameters NO MATCH ', configurationParameterNew.name);
          cloudConnectionInstanceExisting.configuration_parameters.push(configurationParameterNew);
        }
      });
    }
    return cloudConnectionInstanceExisting.configuration_parameters;
  }

  // Add secured to connection parameters
  function addSecuredConnectionParameters(cloudConnectionInstance, providerInstance) {
    // Add secured attribute to Cloud Connection connection_parameters
    if (cloudConnectionInstance.connection_parameters) {
      // Create a map with names amd secured attributes for connection_parameters
      var secureMapConnectionParameters = {};
      if (providerInstance.connection_parameters) {
        providerInstance.connection_parameters.forEach(function(providerInstancePart) {
          secureMapConnectionParameters[providerInstancePart.name] = providerInstancePart.secured;
        });
      } else {
        var err = new Error('Invalid providerInstance');
        next(err); // eslint-disable no-undef
      }

      // Loop through each connection parameter and insert matching secured attribute for connection_parameters
      if (Array.isArray(cloudConnectionInstance.connection_parameters)) {
        cloudConnectionInstance.connection_parameters.forEach(function(connection_parameters, index, theArray) {
          // If there are extra user provided parameters that already indicate it is secured, don't overwrite the
          // value.  IKS connections use this feature.
          if (!theArray[index].secured) {
            theArray[index].secured = secureMapConnectionParameters[theArray[index].name];
          }
        });
      }
    }
  }

  // Add secured to configuration parameters
  function addSecuredConfigurationParameters(cloudConnectionInstance, providerInstance) {
    // Add secured attribute to Cloud Connection configuration_parameters
    if (cloudConnectionInstance.configuration_parameters) {
      // Create a map with names amd secured attributes for configuration_parameters
      var secureMapConfigurationParameters = {};
      if (providerInstance.configuration_parameters) {
        providerInstance.configuration_parameters.forEach(function(providerInstancePart) {
          secureMapConfigurationParameters[providerInstancePart.name] = providerInstancePart.secured;
        });
      } else {
        var err = new Error('Invalid providerInstance');
        next(err); // eslint-disable no-undef
      }

      // Loop through each configuration parameter and insert matching secured attribute for configuration_parameters
      if (Array.isArray(cloudConnectionInstance.configuration_parameters)) {
        cloudConnectionInstance.configuration_parameters.forEach(function(configuration_parameters, index, theArray) {
          theArray[index].secured = secureMapConfigurationParameters[theArray[index].name];
        });
      }
    }
  }

  CloudConnection.observe('before delete', async function(ctx) {
    log.info('Delete was invoked for %s matching %j', ctx.Model.pluralModelName, ctx.where);

    if (ctx.where && ctx.where.id &&
      ('[object String]' === Object.prototype.toString.call(ctx.where.id) ||
        ctx.where.id.constructor.name === 'ObjectID')) {
      var cloudConnectionId = ctx.where.id;

      var cloudConnection = await CloudConnection.findById(cloudConnectionId);
      if (!cloudConnection) {
        throw new errors.CloudConnectionsNotFoundError(cloudConnectionId);
      }

      var filter = {
        where: {
          cloud_connection_ids: {
            regexp: new RegExp('.*'+cloudConnectionId+'.*'),
          },
        },
      };
      var stacks = await CloudConnection.app.models.Stack.find(filter);
      if (stacks && stacks.length > 0) {
        var stackNames = [];
        stacks.forEach(function(stack) {
          stackNames.push(stack.name);
        });
        log.error(`Cannot delete cloud connection ${cloudConnectionId}` +
           ` because the following stacks are associated with it: ${stackNames}`);
        throw new errors.OperationNotSupportedCannotDeleteCC(cloudConnection.name, stackNames);
      }
    }
  });

  // *********************************************************
  //  Add validation information on GET operations
  //  ONLY for connections that do not have validation
  //  status persisted in the database.  This is intended
  //  as a conversion for customers with existing connections
  // *********************************************************
  CloudConnection.afterRemote('**', function(ctx, connection, next) {
    // Listener is registered for all methods, but we only want to take action on a few
    var methodName = ctx.method.name;
    if (connection &&
      (methodName === 'find' ||
        methodName === 'findById')) {
      // 'findById' returns one connection, but 'find' returns a list.  In the list case, we want to use Promises
      // to kick off validation for all connections.  To keep the logic common, we convert a single connection into a
      // list of one connection
      var connections;
      if (Array.isArray(connection))
        connections = connection;
      else
        connections = [].concat(connection);

      // For each connection object, use a Promise to kick off validation
      var validate = Promise.promisify(CloudConnection.validate);
      var allValidations = []; // Used to wait until all validations are complete
      connections.forEach(function(singleConnection) {
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //  Only validate connections that don't have a validate status yet
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        if (singleConnection.validate === undefined) {
          allValidations.push(validate(singleConnection.id).then(function(message) {
            // Append the validation text into the connection object being returned
            singleConnection = Object.assign(singleConnection, message);
          }));
        }
      });

      // Wait for all connection validations to complete before continuing
      Promise.all(allValidations).then(function() {
        next();
      });
    } else {  // Just continue for remote methods we don't care about
      next();
    }
  });

  function isEmpty(str) {
    return (!str || 0 === str.length);
  }

  function validateSoftLayerConnection(username, apikey, cb) {
    var headers = {};
    var creds = username + ':' + apikey;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.getWithOptions('https://api.softlayer.com', 'rest/v3/SoftLayer_Account', {useProxy: true}, headers, function(err, response) {
      if (err) { // an error occurred
        log.error('Failed to validate SoftLayer connection: ', {err, response});
        cb(null, {validate: false, message: 'Failed to validate connection with provided credentials'});
      } else {
        if (response.statusCode === 200) {
          cb(null, {validate: true, message: ''});
        } else {
          log.error('Failed to validate connection.  Response from cloud provider:', response);
          cb(null, {validate: false, message: 'Invalid SoftLayer user name or API key.'});
        }
      }
    });
  }

  // ****************************************
  //  Validate SoftLayer credentials
  // ****************************************
  function testSoftLayerConnection(connection_parameters, cb) {
    var bluemix_api_key = null;
    var username = null;
    var apikey = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'bluemix_api_key':
        bluemix_api_key = parameter.value;
        break;
      case 'softlayer_username':
        username = parameter.value;
        break;
      case 'softlayer_api_key':
        apikey = parameter.value;
        break;
      default:
        break;
      }
    });
    // if bluemix_api_key provided, authenticate using POST to https://iam.ng.bluemix.net/oidc/token with
    // grant_type: urn:ibm:params:oauth:grant-type:apikey
    // apikey: [API key]
    if (isEmpty(bluemix_api_key) && (isEmpty(username) || isEmpty(apikey))) {
      log.error('Either bluemix_api_key or softlayer_api_key and softlayer_username need to be provided');
      cb(null, {validate: false, message: 'Either bluemix_api_key or softlayer_api_key and softlayer_username need to be provided.'});
    } else if (!isEmpty(bluemix_api_key)) {
      var headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      var data = querystring.stringify({'grant_type': 'urn:ibm:params:oauth:grant-type:apikey', 'apikey': bluemix_api_key});
      http_helper.postWithOptions('https://iam.ng.bluemix.net', 'oidc/token', {useProxy: true}, data, headers, function(err, response) {
        if (err) { // an error occurred
          log.error('Failed to validate BlueMix connection: ', {err, response});
          cb(null, {validate: false, message: 'Failed to validate connection with provided credentials'});
        } else {
          if (response.statusCode === 200) {
            // continue with the SL vallidation as both BM and SL keys may be provided
            if (!isEmpty(username) && !isEmpty(apikey)) {
              validateSoftLayerConnection(username, apikey, cb);
            } else {
              cb(null, {validate: true, message: ''});
            }
          } else {
            log.error('Failed to validate connection.  Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Invalid IBM Cloud API Key.'});
          }
        }
      });
    } else {
      validateSoftLayerConnection(username, apikey, cb);
    }
  }

  /**
   * Get Tokens for an IBM Cloud Kubernetes Service connection for use with REST APIs
   */
  function getTokens(apikey) {
    return new Promise(function(resolve, reject) {
      var headers = {
        'Authorization': 'Basic Yng6Yng=',
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      var body = querystring.stringify({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'response_type': 'cloud_iam',
        'apikey': apikey,
      });
      http_helper.postWithOptionsAsync('https://iam.bluemix.net', 'identity/token', {useProxy: true}, body, headers).then(function(response) {
        if (response.statusCode !== 200) {
          reject('Failed to validate connection with provided API key');
        } else {
          var tokens = JSON.parse(response.body);
          resolve(tokens);
        }
      });
    });
  }

  /**
   * Download config file for an IBM Cloud Kubernetes Service connection
   */
  function getKubeconfig(connection, tokens) {
    return new Promise(function(resolve, reject) {
      var headers = {
        'Authorization': 'Bearer ' + tokens.access_token,
        'X-Auth-Refresh-Token': tokens.refresh_token,
        'X-Region': connection.region_name,
      };
      http_helper.getWithOptionsAsync('https://containers.bluemix.net', 'v1/clusters/' + connection.cluster_name + '/config?format=yaml',
        {useProxy: true}, headers).then(function(response) {
        if (response.statusCode !== 200) {
          log.info('Failed to retrieve cluster configuration: ', response);
          reject('Failed to retrieve cluster configuration');
        } else {
          resolve(response.body);
        }
      });
    });
  }

  /**
   * Get the cluster ID for a IBM Cloud Kubernetes Service connection
   */
  function getClusterID(connection, tokens) {
    return new Promise(function(resolve, reject) {
      var headers = {
        'Authorization': 'Bearer ' + tokens.access_token,
        'X-Auth-Refresh-Token': tokens.refresh_token,
        'X-Region': connection.region_name,
      };
      http_helper.getWithOptionsAsync('https://containers.bluemix.net', '/v1/clusters/' + connection.cluster_name, {useProxy: true}, headers
      ).then(function(response) {
        if (response.statusCode !== 200) {
          reject('Failed to retrieve cluster');
        } else {
          var cluster = JSON.parse(response.body);
          resolve(cluster.id);
        }
      });
    });
  }

  // The auto cloud connection create code from an IKS cluster can only return the full version string of the tiller
  // installed on the target cluster.  We need to map that to what cam-provider-helm expects
  // e.g.    "2.8.2"  =>  "v2.8"
  function normalizeHelmVersion(connection_parameters) {
    var version = connection_parameters.find(x => (x.name === 'helm_version'));
    if (version && !version.value.startsWith('v') && version.value.includes('.')) {
      version.value = 'v'+version.value.substring(0, version.value.lastIndexOf('.'));
    }
  }

  // ****************************************************
  //  Validate IBM Cloud Kubernetes Services credentials
  // ****************************************************
  function testIKSConnection(connection_parameters, cb) {
    var injectedParameters = [];
    var tokens;
    var connection = formatConnection(connection_parameters);
    getTokens(connection.bluemix_api_key).then(function(bluemix_tokens) {
      tokens = bluemix_tokens;
      return getClusterID(connection, tokens);
    }).then(function(clusterID) {
      // Update the existing cluster_id or inject a new entry
      var foundClusterId = connection_parameters.find(x => (x.name === 'cluster_id'));
      if (foundClusterId) {
        foundClusterId.value = clusterID;
      } else {
        injectedParameters.push({name: 'cluster_id', value: clusterID});
      }
      return getKubeconfig(connection, tokens);
    }).then(function(kubeconfig) {
      // Update the existing cluster_config or inject a new entry
      var foundClusterConfig = connection_parameters.find(x => (x.name === 'cluster_config'));
      if (foundClusterConfig) {
        foundClusterConfig.value = kubeconfig;
      } else {
        // This one needs to be secured (encrypted) in the database
        injectedParameters.push({name: 'cluster_config', value: kubeconfig, secured: true});
      }
      normalizeHelmVersion(connection_parameters);
      cb(null, {validate: true, message: '', connection_parameters: connection_parameters.concat(injectedParameters)});
    }).catch(function(err) {
      log.error('Failed to validate connection: ', err);
      cb(null, {validate: false, message: err});
    });
  }

  // ****************************************
  //  Validate AWS credentials
  // ****************************************
  function testAWSConnection(connection_parameters, cb) {
    var access_key = null;
    var secret_key = null;
    var session_token = null;
    var region = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'aws_access_key_id':
        access_key = parameter.value;
        break;
      case 'aws_secret_key':
        secret_key = parameter.value;
        break;
      case 'aws_session_token':
        session_token = parameter.value;
        break;
      case 'aws_default_region':
        region = parameter.value;
        break;
      default:
        break;
      }
    });

    AWS.config = new AWS.Config({
      accessKeyId: access_key, secretAccessKey: secret_key, sessionToken: session_token, region: region,
    });

    var proxyAgent = proxy_utils.getProxyAgentForHttps();
    if (proxyAgent) {
      AWS.config.update({
        httpOptions: {agent: proxyAgent},
      });
    }

    var ec2 = new AWS.EC2();
    ec2.describeRegions({'RegionNames': [region]}, function(err, data) {
      if (err) { // an error occurred
        log.error('Failed to validate AWS connection: ', {err, data});
        cb(null, {validate: false, message: 'Failed to validate AWS connection with provided credentials'});
      } else { // successful response
        cb(null, {validate: true, message: ''});
      }
    });
  }

  // ****************************************
  //  Validate Azure credentials
  // ****************************************
  function testAzureConnection(connection_parameters, cb) {
    var clientId = null;
    var clientSecret = null;
    var tenantId = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'arm_client_id':
        clientId = parameter.value;
        break;
      case 'arm_client_secret':
        clientSecret = parameter.value;
        break;
      case 'arm_tenant_id':
        tenantId = parameter.value;
        break;
      default:
        break;
      }
    });

    msRestAzure.loginWithServicePrincipalSecret(clientId, clientSecret, tenantId)
      .then((result) => {
        cb(null, {validate: true, message: ''});
      }, (err) => {
        log.error(err, 'Failed to validate the Azure connection: ');
        cb(null, {validate: false, message: 'Failed to validate Microsoft Azure connection with provided credentials'});
      });
  }

  // ****************************************
  //  Validate OpenStack credentials
  // ****************************************
  function testOpenStackConnection(connection_parameters, cb) {
    var os_auth_url = null;
    var os_username = null;
    var os_password = null;
    var os_domain = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'os_auth_url':
        os_auth_url = parameter.value;
        break;
      case 'os_username':
        os_username = parameter.value;
        break;
      case 'os_password':
        os_password = parameter.value;
        break;
      case 'os_domain_name':
        os_domain = parameter.value;
        break;
      default:
        break;
      }
    });

    //TODO: remove this usage of domain!  keystone.getToken() is throwing an uncaught exception if auth fails right now
    // so to avoid it crashing IaaS we're using domain for the moment.
    // See node-openstack-wrapper issue: https://github.com/godaddy/node-openstack-wrapper/issues/31
    const d = domain.create();
    d.on('error', function(err) {
      log.error(err, 'Failed to validate OpenStack connection: ');
      return cb(null, {validate: false, message: 'Failed to validate OpenStack connection with provided credentials'});
    });

    var keystone = new OSWrap.Keystone(os_auth_url);
    keystone.setRequest(request);
    d.run(function() {
      keystone.getToken(os_username, os_password, os_domain, function(err, _token) {
        if (err) { // an error occurred
          log.error(err, 'Failed to validate OpenStack connection: ');
          return cb(null, {validate: false, message: 'Failed to validate OpenStack connection with provided credentials'});
        } else { // successful response
          return cb(null, {validate: true, message: ''});
        }
      });
    });
  }

  // ****************************************
  //  Validate HuaweiCLoud credentials
  // ****************************************
  function testHuaweiCloudConnection(connection_parameters, cb) {
    var os_auth_url = null;
    var os_username = null;
    var os_password = null;
    var os_domain = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'os_auth_url':
        os_auth_url = parameter.value;
        break;
      case 'os_username':
        os_username = parameter.value;
        break;
      case 'os_password':
        os_password = parameter.value;
        break;
      case 'os_domain_name':
        os_domain = parameter.value;
        break;
      default:
        break;
      }
    });

    //TODO: remove this usage of domain!  keystone.getToken() is throwing an uncaught exception if auth fails right now
    // so to avoid it crashing IaaS we're using domain for the moment.
    // See node-openstack-wrapper issue: https://github.com/godaddy/node-openstack-wrapper/issues/31
    const d = domain.create();
    d.on('error', function(err) {
      log.error(err, 'Failed to validate Huawei cloud connection: ');
      return cb(null, {validate: false, message: 'Failed to validate Huawei cloud connection with provided credentials'});
    });

    var keystone = new OSWrap.Keystone(os_auth_url);
    keystone.setRequest(request);
    d.run(function() {
      keystone.getToken(os_username, os_password, os_domain, function(err, token) {
        if (err) { // an error occurred
          log.error(err, 'Failed to validate Huawei cloud connection: ');
          cb(null, {validate: false, message: 'Failed to validate Huawei cloud connection with provided credentials'});
        } else { // successful response
          cb(null, {validate: true, message: ''});
        }
      });
    });
  }

  // ****************************************
  //  Validate vSphere credentials
  // ****************************************
  function testVSPhereConnection(connection_parameters, cb) {
    var server = null;
    var username = null;
    var password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'vsphere_server':
        server = parameter.value;
        break;
      case 'vsphere_user':
        username = parameter.value;
        break;
      case 'vsphere_password':
        password = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = username + ':' + password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.postWithOptions('https://' + server, 'rest/com/vmware/cis/session',
      {rejectUnauthorized: false, strictSSL: false, timeout: CONN_TIMEOUT, useProxy: true}, '', headers,
      function(err, response) {
        if (err) {
          // an error occurred

          // Be careful about what error text we externalize to the end user.  However, it
          // is very helpful to know when the server connection times out.
          log.error('Failed to validate vSphere connection: ', {err, response});
          var errorMessage = 'Unable to verify connection';
          if (err.message && err.message.includes('ETIMEDOUT')) {
            errorMessage = 'The connection test timed out for ' + server;
          } else if (err.message && err.message.includes('ENOTFOUND')) {
            errorMessage = 'The connection test failed to resolve hostname for ' + server;
          }

          cb(null, {validate: false, message: errorMessage});
        } else {
          if (response.statusCode === 200) {
            cb(null, {validate: true, message: ''}); // Return to validate api immediately

            // Continue on and delete the session now, ignoring errors - note that on old vcenter the REST session delete does
            // not work as technically the REST API was added in vSphere 6.5.0.  Acquiring the session still seems to work on 6.0.0 however.
            try {
              var sessionToken = JSON.parse(response.body).value;
              var delHeaders = {
                'vmware-api-session-id': sessionToken,
              };
              http_helper.delWithOptions('https://' + server, 'rest/com/vmware/cis/session',
                {'rejectUnauthorized': false, timeout: CONN_TIMEOUT, useProxy: true}, delHeaders,
                function(delErr, delResponse) {
                  if (delErr) {
                    log.warn(delErr, 'Unable to delete vSphere session. If vCenter is < 6.5.0 this is expected.');
                  } else if (delResponse.statusCode !== 200) {
                    log.warn('Unable to delete vSphere session. If vCenter is < 6.5.0 this is expected. statusCode: ' +
                      delResponse.statusCode);
                  } else {
                    log.info('Succesfully deleted vsphere session');
                  }
                });
            } catch (parseErr) {
              log.error(parseErr, 'Unable to parse vsphere session token');
            }
          } else {
            log.error('Failed to validate connection.  Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Unknown user name or credential.'});
          }
        }
      });
  }

  // ****************************************
  //  Validate NSXv credentials
  // ****************************************
  function testNSXvConnection(connection_parameters, cb) {
    var server = null;
    var username = null;
    var password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'nsxv_nsx_manager_uri':
        server = parameter.value;
        break;
      case 'nsxv_user':
        username = parameter.value;
        break;
      case 'nsxv_password':
        password = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = username + ':' + password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.getWithOptions(server, 'api/2.0/services/usermgmt/user/' + username,
      {'rejectUnauthorized': false, useProxy: true}, headers, function(err, response) {
        if (err) {
        // an error occurred
        // Be careful about what error text we externalize to the end user.  However, it
        // is very helpful to know when the server connection times out.
          log.error('Failed to validate NSXv connection: ', {err, response});
          var errorMessage = 'Unable to verify connection';
          if (err.message && err.message.includes('ETIMEDOUT')) {
            errorMessage = 'The connection test timed out for ' + server;
          } else if (err.message && err.message.includes('ENOTFOUND')) {
            errorMessage = 'The connection test failed to resolve hostname for ' + server;
          }

          cb(null, {validate: false, message: errorMessage});
        } else {
          if (response.statusCode === 200) {
            cb(null, {validate: true, message: ''});
          } else {
            log.error('Failed to validate connection.  Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Unknown user name or credential.'});
          }
        }
      });
  }

  // ****************************************
  //  Validate NSX-T credentials
  // ****************************************
  function testNSXtConnection(connection_parameters, cb) {
    var server = null;
    var username = null;
    var password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'nsxt_manager_host':
        server = parameter.value;
        break;
      case 'nsxt_username':
        username = parameter.value;
        break;
      case 'nsxt_password':
        password = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = username + ':' + password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.getWithOptions('https://' + server, 'api/v1/aaa/user-info',
      {'rejectUnauthorized': false, useProxy: true}, headers, function(err, response) {
        if (err) {
        // an error occurred
        // Be careful about what error text we externalize to the end user.  However, it
        // is very helpful to know when the server connection times out.
          log.error('Failed to validate NSX-T connection: ', {err, response});
          var errorMessage = 'Unable to verify connection';
          if (err.message && err.message.includes('ETIMEDOUT')) {
            errorMessage = 'The connection test timed out for ' + server;
          } else if (err.message && err.message.includes('ENOTFOUND')) {
            errorMessage = 'The connection test failed to resolve hostname for ' + server;
          }

          cb(null, {validate: false, message: errorMessage});
        } else {
          if (response.statusCode === 200) {
            cb(null, {validate: true, message: ''});
          } else {
            log.error('Failed to validate connection.  Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Unknown user name or credential.'});
          }
        }
      });
  }

  // ****************************************
  //  Validate Google Cloud credentials
  // ****************************************
  function testGoogleCloudConnection(connection_parameters, cb) {
    var google_credentials = null;
    var google_project = null;
    var google_region = null;

    var credFileParseError = null;
    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'google_credentials':
        google_credentials = parameter.value;
        if ('[object Object]' !== Object.prototype.toString.call(google_credentials)) {
          try {
            google_credentials = JSON.parse(google_credentials);
          } catch (error) {
            log.error(error, 'Failed to parse credentials file');
            credFileParseError = error;
          }
        }
        break;

      case 'google_project':
        google_project = parameter.value;
        break;

      default:
        break;
      }
    });

    if (credFileParseError) {
      return cb(null, {validate: false, message: 'Failed to parse the credentials file. Invalid JSON.'});
    }

    var config = {
      projectId: google_project,
      credentials: google_credentials,
    };
    try {
      var compute = require('@google-cloud/compute')(config);
      const options = {
        maxResults: 1,
      };
      compute.getZones(options, (err, zones) => {
        if (err) {
          log.error(err, 'Failed to validate Google cloud connection');
          cb(null, {validate: false, message: err.message});
        } else {
          cb(null, {validate: true, message: ''});
        }
      });
    } catch (err) {
      log.error(err, 'Exception validating connection');
      cb(null, {validate: false, message: 'Failed to validate Google Cloud connection with provided credentials'});
    }
  }

  // ****************************************
  //  Validate IBM Cloud Private credentials
  // ****************************************
  function testIBMCloudPrivateConnection(connection_parameters, cb) {
    // If this is the implicit ICP connection, always return true validation.
    if (connection_parameters && connection_parameters[0] && connection_parameters[0].name === 'implicit') {
      cb(null, {validate: true, message: ''});
      return;
    }

    var server = null;
    var username = null;
    var password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'ICP_server':
        server = parameter.value;
        break;
      case 'username':
        username = parameter.value;
        break;
      case 'password':
        password = parameter.value;
        break;
      default:
        break;
      }
    });

    try {
      var headers = {};
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      var body = querystring.stringify({
        'grant_type': 'password',
        'scope': 'openid',
        'username': username,
        'password': password,
      });

      if (!server) {
        server = process.env.ICP_MASTER_IP;
      }

      var ICP_ENDPOINT = 'https://' + server + ':8443';

      // TODO:  Needs to support proxy? - Possibly in a later phase in case we need to support a different external ICP.
      http_helper.postWithOptions(ICP_ENDPOINT, '/idprovider/v1/auth/identitytoken',
        {'rejectUnauthorized': false, timeout: CONN_TIMEOUT}, body, headers,
        function(err, response) {
          if (err) {
          // Be careful about what error text we externalize to the end user.  However, it
          // is very helpful to know when the server connection times out.
            log.error('Failed to validate IBM Cloud Private connection: ', {err, response});
            var errorMessage = 'Unable to verify connection';
            if (err.message && err.message.includes('ETIMEDOUT')) {
              errorMessage = 'The connection test timed out for ' + server;
            } else if (err.message && err.message.includes('ENOTFOUND')) {
              errorMessage = 'The connection test failed to resolve hostname for ' + server;
            }

            cb(null, {validate: false, message: errorMessage});
          } else {
            if (response.statusCode === 200) {
              cb(null, {validate: true, message: ''});
            } else {
              log.error('Failed to validate connection.  Response from cloud provider:', response);
              cb(null, {validate: false, message: 'Unknown user name or credential.'});
            }
          }
        });
    } catch (err) {
      log.error('Exception validating connection: ', err);
      cb(null, {validate: false, message: 'Failed to validate IBM Cloud Private connection with provided credentials'});
    }
  }

  // ****************************************
  //  Validate PureApp credentials
  // ****************************************
  function testPureAppConnection(connection_parameters, cb) {
    var server = null;
    var username = null;
    var password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'pureapp_server':
        server = parameter.value;
        break;
      case 'pureapp_user':
        username = parameter.value;
        break;
      case 'pureapp_password':
        password = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = username + ':' + password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.postWithOptions('https://' + server, '/resources/version', {'rejectUnauthorized': false, useProxy: true}, '', headers, function(err, response) {
      if (err) {
        // an error occurred

        // Be careful about what error text we externalize to the end user.  However, it
        // is very helpful to know when the server connection times out.
        log.error('Failed to validate PureApp connection: ', {err, response});
        var errorMessage = 'Unable to verify connection';
        if (err.message && err.message.includes('ETIMEDOUT')) {
          errorMessage = 'The connection test timed out for ' + server;
        } else if (err.message && err.message.includes('ENOTFOUND')) {
          errorMessage = 'The connection test failed to resolve hostname for ' + server;
        }

        cb(null, {validate: false, message: errorMessage});
      } else {
        if (response.statusCode === 200) {
          cb(null, {validate: true, message: ''});
        } else {
          log.error('Failed to validate connection.  Response from cloud provider:', response);
          cb(null, {validate: false, message: 'Unknown user name or credential.'});
        }
      }
    });
  }

  // ****************************************
  //  Validate Nutanix credentials
  // ****************************************
  function testNutanixConnection(connection_parameters, cb) {
    var nutanix_endpoint = null;
    var nutanix_username = null;
    var nutanix_password = null;
    var nutanix_port = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'nutanix_endpoint':
        nutanix_endpoint = parameter.value;
        break;
      case 'nutanix_username':
        nutanix_username = parameter.value;
        break;
      case 'nutanix_password':
        nutanix_password = parameter.value;
        break;
      case 'nutanix_port':
        nutanix_port = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = nutanix_username + ':' + nutanix_password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');
    http_helper.getWithOptions('https://' + nutanix_endpoint + ':' + nutanix_port, '/api/nutanix/v3/users/me', {useProxy: true}, headers,
      function(err, response) {
        if (err) {
          log.error('Failed to validate Nutanix connection: ', {err, response});
          var errorMessage = 'Unable to verify connection';
          if (err.message && err.message.includes('ETIMEDOUT')) {
            errorMessage = 'The connection test timed out for ' + nutanix_endpoint;
          } else if (err.message && err.message.includes('ENOTFOUND')) {
            errorMessage = 'The connection test failed to resolve hostname for ' + nutanix_endpoint;
          }

          cb(null, {validate: false, message: errorMessage});
        } else {
          if (response.statusCode === 200) {
            cb(null, {validate: true, message: ''});
          } else {
            log.error('Failed to validate connection. Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Unknown user name or credential.'});
          }
        }
      });
  }

  //****************************************
  //Validate ICO credentials
  //****************************************
  function testICOConnection(connection_parameters, cb) {
    var ico_server = null;
    var ico_username = null;
    var ico_password = null;

    connection_parameters.forEach(function(parameter) {
      switch (parameter.name) {
      case 'ico_server':
        ico_server = parameter.value;
        break;
      case 'ico_username':
        ico_username = parameter.value;
        break;
      case 'ico_password':
        ico_password = parameter.value;
        break;
      default:
        break;
      }
    });

    var headers = {};
    var creds = ico_username + ':' + ico_password;
    headers['Authorization'] = 'Basic ' + new Buffer(creds).toString('base64');

    var ICO_ENDPOINT = 'https://' + ico_server + ':443';

    http_helper.getWithOptions(ICO_ENDPOINT, 'orchestrator/v2/offerings', {'rejectUnauthorized': false}, headers,
      function(err, response) {
        if (err) {
        // an error occurred
          log.error('Failed to validate ICO connection: ', {err, response});
          var errorMessage = 'Unable to verify connection';
          if (err.message && err.message.includes('ETIMEDOUT')) {
            errorMessage = 'The connection test timed out for ' + ico_server;
          } else if (err.message && err.message.includes('ENOTFOUND')) {
            errorMessage = 'The connection test failed to resolve hostname for ' + ico_server;
          }

          cb(null, {validate: false, message: errorMessage});
        } else {
          if (response.statusCode === 200) {
            cb(null, {validate: true, message: ''});
          } else {
            log.error('Failed to validate connection.  Response from cloud provider:', response);
            cb(null, {validate: false, message: 'Unknown user name or credential.'});
          }
        }
      });
  }

  // *******************************************************************
  // Common implementation of the high level validate connection logic
  // *******************************************************************
  function validateConnection(connection_parameters, provider_id, cb) {
    try {
      CloudConnection.app.models.Provider.findById(provider_id, function(err, connectionProvider) {
        if (connectionProvider && connectionProvider.name) {
          switch (connectionProvider.name) {
          case 'IBM':
            testSoftLayerConnection(connection_parameters, cb);
            break;
          case 'IBM Cloud Kubernetes Service':
            testIKSConnection(connection_parameters, cb);
            break;
          case 'Amazon EC2':
            testAWSConnection(connection_parameters, cb);
            break;
          case 'VMware vSphere':
            testVSPhereConnection(connection_parameters, cb);
            break;
          case 'VMware NSXv':
            testNSXvConnection(connection_parameters, cb);
            break;
          case 'VMware NSX-T':
            testNSXtConnection(connection_parameters, cb);
            break;
          case 'Microsoft Azure':
            testAzureConnection(connection_parameters, cb);
            break;
          case 'OpenStack':
            testOpenStackConnection(connection_parameters, cb);
            break;
          case 'Google Cloud':
            testGoogleCloudConnection(connection_parameters, cb);
            break;
          case 'IBM Cloud Private':
            testIBMCloudPrivateConnection(connection_parameters, cb);
            break;
          case 'IBM PureApplication':
            testPureAppConnection(connection_parameters, cb);
            break;
          case 'Nutanix':
            testNutanixConnection(connection_parameters, cb);
            break;
          case 'Huawei Cloud':
            testHuaweiCloudConnection(connection_parameters, cb);
            break;
          case 'ICO':
            testICOConnection(connection_parameters, cb);
            break;
          case 'Other':
            // No validation needed
            cb(null, {validate: true, message: ''});
            break;
          case 'BPM':
            // No validation needed, As it is dummy/fake BPM Connection
            cb(null, {validate: true, message: ''});
            break;
          default:
            cb(null, {
              validate: false, message: 'Test connection not yet supported for ' +
                  connectionProvider.name + ' connection types.',
            });
          }
        } else {
          if (err) {
            log.info('Exception finding provider', err);
          }
          cb(null, {validate: false, message: 'Provider required to enable test connection.'});
        }
      });
    } catch (er) {
      cb(null, {validate: false, message: 'Unable to test connection at this time.'});
    }
  }

  //
  // 1) If cloudConnectionInstanceExisting exists, will merge parameters on the cloudConnectionInstance with previous parameters.
  // 2) Will check the provivderId, will ensure secured params are copied from the provider (and confirm provider exists).
  // 3) Will validate the (newly merged) cloudConnectionInstance and set the validation status as validate and
  //    message in the cloudConnectionInstance.
  //
  // Returns the updated cloudConnectionInstance
  var mergeAndValidateAsync = async function(cloudConnectionInstance, cloudConnectionInstanceExisting) {
    // 1)
    if (cloudConnectionInstanceExisting) {
      try {
        // Update existing connection parameters fields with new values
        cloudConnectionInstance.connection_parameters = updateConnectionParameters(cloudConnectionInstance,
          cloudConnectionInstanceExisting);

        // Update existing configuration parameter fields with new values
        cloudConnectionInstance.configuration_parameters = updateConfigurationParameters(cloudConnectionInstance,
          cloudConnectionInstanceExisting);

        if (!cloudConnectionInstance.providerId) {
          // on a PUT, providerId may not have been passed in, copy it from existing instance so check 2 can proceed
          cloudConnectionInstance.providerId = cloudConnectionInstanceExisting.providerId;
        }
      } catch (mergeParamsErr) {
        log.error(mergeParamsErr, 'Unable to merge cc params with params in db');
        throw new errors.InvalidRequestError(mergeParamsErr);
      }
    }

    // 2) Check for valid cloudConnection data - merge with attributes from provider
    if (cloudConnectionInstance.providerId) {
      // Find provider that matches cloudConnection provider ID
      var providerInstance = null;
      try {
        providerInstance = await CloudConnection.app.models.Provider.findById(cloudConnectionInstance.providerId);
      } catch (findProviderErr) {
        log.error(findProviderErr, 'Unable to find provider with id: ' + cloudConnectionInstance.providerId);
        throw new errors.ProviderNotFoundError(cloudConnectionInstance.providerId);
      }
      if (!providerInstance) {
        throw new errors.ProviderNotFoundError(cloudConnectionInstance.providerId);
      }
      log.info('providerInstance is ', providerInstance.name);

      try {
        // Add secured attribute to Cloud Connection connection_parameters
        addSecuredConnectionParameters(cloudConnectionInstance, providerInstance);

        // Add secured attribute to Cloud Connection configuration_parameters
        addSecuredConfigurationParameters(cloudConnectionInstance, providerInstance);
      } catch (mergeParamsFromProviderErr) {
        log.error(mergeParamsFromProviderErr, 'Unable to merge cc params with provider params');
        throw new errors.InvalidRequestError(mergeParamsFromProviderErr);
      }
    }

    // 3) Validate the connection
    // Let error from validate connection get sent back directly if there is one (i.e. no try/catch)
    // Note that errors from validation would be unexpected ones - normally if validation does not work, it will NOT throw
    // an exception, but instead return the valData containing validate=false and a message
    var validationData = await new Promise(function(resolve, reject) {
      validateConnection(cloudConnectionInstance.connection_parameters, cloudConnectionInstance.providerId, function(valErr, valData) {
        if (valErr) {
          reject(valErr);
        }
        resolve(valData);
      });
    });
    // 'validationData' contains the validation and message for the connection, merge it into the connection object
    cloudConnectionInstance = Object.assign(cloudConnectionInstance, validationData);

    return cloudConnectionInstance;
  };

  // Various operations to perform before saving
  //
  // 1) If this is an update, merge the passed in data with previous
  // 2) Make sure data passed in is merged with secured attributes on the provider parameters
  // 3) Make sure we do a validate and update the validate status before finally saving
  CloudConnection.observe('before save', async function(ctx) {
    var cloudConnectionInstance = null;
    if (ctx.instance) {
      log.info('Cloud Connection before save was invoked remotely with ctx.instance');
      cloudConnectionInstance = ctx.instance;
    } else if (ctx.data) {
      log.info('Cloud Connection before save was invoked remotely with ctx.data');
      cloudConnectionInstance = ctx.data;
    }

    if (!cloudConnectionInstance) {
      return; // Nothing to do here (this shouldn't happen)
    }

    // First check to see if data has been passed in that needs to be merged with data already in the CC
    // (For example on a PUT where only a subset of connection_parameters is passed in)
    var cloudConnectionInstanceExisting = null;
    if (ctx.where && ctx.where.id) {
      try {
        cloudConnectionInstanceExisting = await CloudConnection.findById(ctx.where.id);
      } catch (findByIdErr) {
        log.error(findByIdErr, 'Unable to find CC with id: ' + ctx.where.id);
        throw new errors.InvalidRequestErrorCCNotFound(ctx.where.id);
      }
      if (!cloudConnectionInstanceExisting) {
        throw new errors.InvalidRequestErrorCCNotFound(ctx.where.id);
      }
    }

    // Call mergeAndValidateAsync to do steps 1)-3)
    cloudConnectionInstance = await mergeAndValidateAsync(cloudConnectionInstance, cloudConnectionInstanceExisting);

    // Assign back the updated cloudConnectionInstance to be saved in the db
    if (ctx.instance) {
      ctx.instance = cloudConnectionInstance;
    } else if (ctx.data) {
      ctx.data = cloudConnectionInstance;
    }
  });

  // *******************************************
  //  Validate cloud connection credentials API
  // *******************************************
  CloudConnection.validate = function(id, connection_parameters, cb) {
    log.info('Validate CloudConnection with ID=' + id);

    CloudConnection.findById(id, function(err, cloudConnectionToValidate) {
      // Handle error cases
      if (err) {
        cb(err, null);
        return;
      } else if (!cloudConnectionToValidate) {
        cb(null, {validate: false, message: 'Connection ID not found'});
        return;
      }

      if (connection_parameters) {
        // If connection_parameters are passed in, merge with the existing cc in the db (cloudConnectionToValidate)
        // and then do the validation.  In this case we will NOT save to the db, as this is for the UI to validate BEFORE saving.
        mergeAndValidateAsync({connection_parameters: connection_parameters}, cloudConnectionToValidate).then(function(validatedCc) {
          var reply = {
            validate: validatedCc.validate,
            message: validatedCc.message,
          };
          return cb(null, reply);
        }, function(mergeAndValidateErr) {
          log.error(mergeAndValidateErr, 'Error merging before validation');
          return cb(null, {validate: false, message: 'Unable to test connection at this time.'});
        });
      } else {
        // If connection_parameters are NOT passed in, will validate the existing entry in the db by calling SAVE - this will update
        // the record in the db with the validation status as well.
        // Shortcut: the save method effectively calls and persists the validation
        cloudConnectionToValidate.save(function(err2, instance) {
          if (err2) {
            return cb(null, {validate: false, message: 'Unable to test connection at this time.'});
          } else {
            var reply = {
              validate: instance.validate,
              message: instance.message,
            };
            return cb(null, reply);
          }
        });
      }
    });
  };

  // *******************************************
  //  Validate cloud connection credentials API
  // *******************************************
  CloudConnection.prevalidate = function(connection_parameters, providerId, cb) {
    log.info('Pre-validate CloudConnection attributes');
    validateConnection(connection_parameters, providerId, cb);
  };

  CloudConnection.remoteMethod(
    'validate',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'connection_parameters', type: 'array', required: false},
      ],
      description: ['Validates the connection parameters of an existing CloudConnection instance'],
      notes: [swagger_constants.EOA_ROLES],
      returns: {arg: 'body', type: 'object'}, //TODO: should use root: true so you don't end up with body inside the response body
      http: {path: '/:id/validate', verb: 'post'},
    }
  );

  CloudConnection.remoteMethod(
    'prevalidate',
    {
      accepts: [
        {arg: 'connection_parameters', type: 'array', required: true},
        {arg: 'providerId', type: 'string', required: true},
      ],
      description: ['Validates provided connection parameters without creating a CloudConnection instance'],
      notes: [swagger_constants.EOA_ROLES],
      returns: {arg: 'body', type: 'object'}, //TODO: should use root: true so you don't end up with body inside the response body
      http: {path: '/validate', verb: 'post'},
    }
  );

  const DATATYPE_PREFIX = 'com.ibm.cloud.cloudconnections.';

  /**
   * Constructs the datatype for a given provider
   */
  function getDataType(provider) {
    return DATATYPE_PREFIX + provider.datatype_identifier;
  };

  /**
   * Retrieve the provider identifier from a datatype
   */
  function getProviderIdentifier(dataTypeName) {
    var identifier = null;
    if (dataTypeName.startsWith(DATATYPE_PREFIX)) {
      // dataTypeName has the following format:
      // 'com.ibm.cloud.cloudconnections.{provider_identifier}'
      identifier = dataTypeName.slice(DATATYPE_PREFIX.length);
    } else if (dataTypeName.includes('*')) {
      // check if the dataTypeName matches the DATATYPE_PREFIX
      var re = datatypeutils.buildRegExp(dataTypeName);
      if (re.test(DATATYPE_PREFIX)) {
        identifier = '*'; // all providers
      }
    }

    return identifier;
  };

  /**
   * Returns list of cloud connection instances.
   * The cloud connections will be filtered by the current filter and the namespace and tenant IDs set in the context.
   * The method should not be invoked from the cloudconnections REST API as it's already part of the mixin for this model.
   *
   * @param {*} context
   * @param {*} filter
   */
  CloudConnection.findByFilterAsync = function(context, filter) {
    // invoke the mixin method to build up the new filter
    filter = CloudConnection.getFilterForTenantAndNamespaceFromCtx(context, filter);
    return CloudConnection.find(filter);
  };

  /**
   * Return the list of cloud connection instances that match the provider
   * The result is an array in this format:
   * [
   *  {
   *    "label": "Cloud connections for Amazon EC2",
   *    "name": "com.ibm.cloud.cloudconnections.Amazon_EC2",
   *    "dataobjects": [
   *       {
   *           "id": "5a8334c68f376700207b1cc7",
   *           "name": "My AWS cloud connection",
   *           "provider": "Amazon EC2",
   *           "datatype": "com.ibm.cloud.cloudconnections.Amazon_EC2"
   *       }
   *    ]
   *  }
   * ]
   *
   * @param {*} context
   * @param {*} dataTypeName
   */
  CloudConnection.findByDataType = function(context, dataTypeName) {
    return new Promise(function(resolve, reject) {
      var providerIdentifier = getProviderIdentifier(dataTypeName);
      if (!providerIdentifier) {
        return resolve([]);
      }

      // build the regular expression for filter
      providerIdentifier = datatypeutils.buildDataTypeNameFilter(providerIdentifier);
      var filter = {
        where: {datatype_identifier: providerIdentifier},
        include: {relation: 'cloudconnections'},
      };
      CloudConnection.app.models.Provider.find(filter, function(findErr, providers) {
        if (findErr) {
          return reject(findErr);
        }

        var result = [];
        async.forEach(providers, function(provider, callback) {
          var datatypeElement = {
            name: getDataType(provider),
            label: 'Cloud connections for ' + provider.name,
            dataobjects: [],
          };

          var cloudConnectionFilter = CloudConnection.getFilterForTenantAndNamespaceFromCtx(context, {});
          provider.cloudconnections(cloudConnectionFilter, function(err, cloudConnections) {
            if (err) {
              log.error(err, 'Failed to retrieve the cloud connections for provider %s', provider.name);
              return callback(err);
            } else {
              cloudConnections.forEach(function(cloudConnection) {
                var dataObject = {
                  id: cloudConnection.id,
                  name: cloudConnection.name,
                  provider: provider.name,
                  datatype: getDataType(provider),
                };
                datatypeElement.dataobjects.push(dataObject);
              });
              result.push(datatypeElement);
              return callback();
            }
          });
        }, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });
  };

  CloudConnection.getOutputValues = function(id) {
    return new Promise(function(resolve, reject) {
      var cloudConnection = null;
      CloudConnection.findById(id)
        .then(function(_cloudConnection) {
          if (!_cloudConnection) {
            throw new errors.CloudConnectionsNotFoundError(id);
          }
          cloudConnection = _cloudConnection;
          return CloudConnection.app.models.Provider.findById(cloudConnection.providerId);
        })
        .then(function(provider) {
          if (!provider) {
            throw new errors.ProvidersNotFoundError(cloudConnection.providerId);
          }
          var dataTypeName = getDataType(provider);
          var outputs = cloudConnection.connection_parameters;
          return resolve([dataTypeName, cloudConnection.name, outputs]);
        })
        .catch(function(err) {
          log.error(err, 'Failed to retrieve the output for cloud connection %s', id);
          reject(err);
        });
    });
  };

  CloudConnection.findByDataTypeAndName = function(dataTypeName, dataObjectName, tenantId, namespaceId, cb) {
    var datatypeIdentifier = getProviderIdentifier(dataTypeName);
    if (datatypeIdentifier) {
      CloudConnection.app.models.Provider.findOne({where: {datatype_identifier: datatypeIdentifier}})
        .then(function(provider) {
          if (provider) {
            var filter = {
              where: {
                name: dataObjectName,
                providerId: provider.id,
              },
            };

            // invoke the mixin method to build up the new filter that includes the namespace and tenant where clauses
            filter = CloudConnection.getFilterForTenantAndNamespace(tenantId, namespaceId, filter);
            return CloudConnection.findOne(filter);
          } else {
            return null;
          }
        })
        .then(function(cloudConnection) {
          return cb(null, cloudConnection);
        }, function(err) {
          log.error(err, 'Failed to retrieve the cloud connection by datatype %s and name %s',
            dataTypeName, dataObjectName);
          return cb(err);
        });
    } else {
      return cb(null, null /* not found */);
    }
  };

  CloudConnection.findByName = function(connectionName) {
    return new Promise(function(resolve, reject) {
      CloudConnection.findOne({where: {name: connectionName}}, function(findErr, connection) {
        if (findErr) {
          log.error(findErr, 'Error finding CloudConnection with name: ' + connectionName);
          return reject(findErr);
        }
        if (!connection) {
          log.error('Unable to find connection with name: ' + connectionName);
          return reject(new errors.CloudConnectionsNotFoundError(connectionName));
        } else {
          resolve(connection);
        }
      });
    });
  };

  // Custom function to update -- will NOT update namespaceId or tenantId if existing instance is found
  CloudConnection.createOrUpsertNoRbacUpdate = function(upsertWithWhereFilter, ccData, cb) {
    // findOne takes normal filter - left method signature this way to align with dataobject function which works the same
    CloudConnection.findOne({where: upsertWithWhereFilter}, function(ccFindErr, ccInstance) {
      if (ccFindErr) {
        log.error(ccFindErr, 'Error querying database for cloud connections');
        return callback(ccFindErr);
      }

      if (ccInstance) {
        // In this case we want to update the existing cloud conn - do NOT include namespaceId or tenantId as we will
        // leave the values already in the cloud conn (this avoids things like overwriting a namespaceId that was set to
        // global on the cloud conn for instance).
        delete ccData.tenantId;
        delete ccData.namespaceId;
        return ccInstance.updateAttributes(ccData, cb);
      } else {
        return CloudConnection.create(ccData, cb);
      }
    });
  };

  //
  // Call that uses the dataobject format for input to create a cloud connection
  //
  // ownerId is the id of the parent stack that will "own" this cloud connection
  //
  CloudConnection.upsertDataObject = function(ownerId, dataObjectInfo, callback) {
    log.info('Creating or updating cloud connection with name: ' +
      dataObjectInfo.name + ' for ownerId: ' + ownerId + ' ...');

    var datatypeIdentifier = getProviderIdentifier(dataObjectInfo.datatype);
    if (!datatypeIdentifier) {
      log.error('Unable to find provider for data type: ' + dataObjectInfo.datatype);
      return callback(new Error('Unable to find provider for data type: ' + dataObjectInfo.datatype));
    }
    CloudConnection.app.models.Provider.findOne({where: {datatype_identifier: datatypeIdentifier}}, function(findErr, provider) {
      if (findErr) {
        log.error(findErr, 'Error finding provider with datatype identifier: ' + datatypeIdentifier);
        return callback(findErr);
      }
      if (!provider) {
        log.error('Unable to find provider with name: ' + datatypeIdentifier);
        return callback(new Error('Unable to find provider with name: ' + datatypeIdentifier));
      }

      // Build filter to locate if we already have a cloud connection that we should be updating
      var upsertWithWhereFilter = {
        ownerId: ownerId,
        providerId: provider.id,
        /*
         * Note for cloud connections we are NOT doing upsertWithWhere specifying name in the filter
         * This means we are only allowing 1 cloud connection per ownerId + provider id.  If you run
         * this upsert again, it will update the same entry, therefore allowing name updates on the
         * cloud connection.
         */
        // Note we are also NOT filtering with tenantId or namespaceId - since we're already filtering by ownerId
        // (the id of the parent stack).
      };

      // Build data we will insert into the db
      ccData = {
        ownerId: ownerId,
        providerId: provider.id,
        connection_parameters: [],
        name: dataObjectInfo.name,
        description: dataObjectInfo.description,
      };

      // Update data with tenantId and namespaceId
      if (dataObjectInfo.tenantId) {
        ccData.tenantId = dataObjectInfo.tenantId;
      }
      if (dataObjectInfo.namespaceId || dataObjectInfo.namespaceId === '') { // Check for '' as this means global namespace
        ccData.namespaceId = dataObjectInfo.namespaceId;
      }

      for (var i = 0; i < dataObjectInfo.attributes.length; i++) {
        // For cloud connections, dataobject.attributes will be assumed to be connection_parameters
        ccData.connection_parameters.push(dataObjectInfo.attributes[i]);
      }

      CloudConnection.createOrUpsertNoRbacUpdate(upsertWithWhereFilter, ccData, function(upsertErr, cloudConnection) {
        if (upsertErr) {
          return callback(upsertErr);
        }
        // Return result in common dataobject condensed format
        var result = {
          datatype: dataObjectInfo.datatype,
          name: cloudConnection.name,
          id: cloudConnection.id,
        };
        return callback(null, result);
      });
    });
  };

  // NOTE: /cloudconnections/{id}/providers is actually defined from the Provider shared class, so notes field is not set here
  CloudConnection.sharedClass.findMethodByName('find', true).notes = swagger_constants.VEOA_ROLES;
  CloudConnection.sharedClass.findMethodByName('findById', true).notes = swagger_constants.VEOA_ROLES;
  CloudConnection.sharedClass.findMethodByName('findOne', true).notes = swagger_constants.VEOA_ROLES;
  CloudConnection.sharedClass.findMethodByName('count', true).notes = swagger_constants.VEOA_ROLES;

  CloudConnection.sharedClass.findMethodByName('create', true).notes = swagger_constants.OA_ROLES;
  CloudConnection.sharedClass.findMethodByName('prototype.patchAttributes', true).notes = swagger_constants.OA_ROLES;
  CloudConnection.sharedClass.findMethodByName('destroyById', true).notes = swagger_constants.OA_ROLES;

  CloudConnection.disableRemoteMethodByName('createChangeStream');
  CloudConnection.disableRemoteMethodByName('exists');
  CloudConnection.disableRemoteMethodByName('replace');
  CloudConnection.disableRemoteMethodByName('createChangeStream');
  CloudConnection.disableRemoteMethodByName('updateAll');
  CloudConnection.disableRemoteMethodByName('updateAttributes');
  CloudConnection.disableRemoteMethodByName('replaceOrCreate');
  CloudConnection.disableRemoteMethodByName('replaceById');
  CloudConnection.disableRemoteMethodByName('upsert');
  CloudConnection.disableRemoteMethodByName('upsertWithWhere');
  CloudConnection.disableRemoteMethodByName('prototype.__get__tenant');
};
