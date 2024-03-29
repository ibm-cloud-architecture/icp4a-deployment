## Prerequisites

### Generate IBM Event Streams API key from Admin UI
Example:
```
{"name":"dbamc-bai","api_key":"gbSA_jxUBeoVyqmvdoZvePoPWS_W1SaHOKmuQCk-xH93"}
```
### Get the IBM Event Streams PEM certificate from Admin UI.
The PEM certificate file content:
```
-----BEGIN CERTIFICATE-----
MIIDRjCCAi6gAwIBAgIIFathpNBX06UwDQYJKoZIhvcNAQELBQAwKjEMMAoGA1UE
ChMDSUJNMRowGAYDVQQLExFJQk0gRXZlbnQgU3RyZWFtczAeFw0xOTA2MjUwNzUw
NTZaFw0yOTA2MjIwNzUwNTZaMCoxDDAKBgNVBAoTA0lCTTEaMBgGA1UECxMRSUJN
IEV2ZW50IFN0cmVhbXMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC/
79ogz3BkFVZ/XTL1X+cCyz6t/mAC6Xc5u4VlncN/dh6KDiUAMa+d29DqYb5dCDEv
zfSTMBVhQjA4yDGf4PSXQnSZtTOtxvAX0/2Zd5sGEinuOisoanKVSgsirjlGXjCR
O4MHbQXsQWl3c6lyHEoFWcO85bYe6Ux5XYY/WNY7hKMIiLo5tEDfcm4ExVS+Rghz
qsyReL+17i6YG2rEEy8Bhu2/ZiOHK+GFMFO9ZFZojxSyAuupRz6VKb/xyr76rwA7
e3MxnONG2WjiijHnYBvsM/3QpwGfPyD+7P3JvcdK+uqaQlaDuRzK4Snu/MAs6pl3
xjhpPw2Z8p6UNoRLUkoHAgMBAAGjcDBuMA4GA1UdDwEB/wQEAwIBpjAPBgNVHRMB
Af8EBTADAQH/MEsGA1UdEQREMEKCCWRiYW1jLmljcIIpZGJhbWMuaWNwLmV2ZW50
LXN0cmVhbXMuc3ZjLmNsdXN0ZXIubG9jYWyHBKwQNNeHBKwQNNgwDQYJKoZIhvcN
AQELBQADggEBAEgv2feYIYUgtOH9Jx/WBOx5pqldAVeej7yhu0lnAfArcWjsbTwY
1Deb5bpp3WhD9JfVFEpp9QfNwlF41HfSuJ90LWwb1cM1v2xJhLXJHOJSdvIDHLTU
c5xwrfLpLGDUEfDfO0yyCwc1Q2LxeoKOFT73NQTnuH21tgKT1w1lg1fYEnUEN14D
O9TifsNQFkH64hs4MTruUSyjW5ILsOGHyoccFoEqkm9IIBOGPnsh2YDIHgCnw3vq
eStMartUOlpkmPCFsjjEGQnfs24vq7bAxiPMup6mmT8kY3fIk62+3Y2c6hnI0b3D
xfxWhSULSKzxk8AdCExM3itBy4O0y9Tx20o=
-----END CERTIFICATE-----
```
We need convert it to Base64 string:
```
LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURSakNDQWk2Z0F3SUJBZ0lJRmF0aHBOQlgwNlV3RFFZSktvWklodmNOQVFFTEJRQXdLakVNTUFvR0ExVUUKQ2hNRFNVSk5NUm93R0FZRFZRUUxFeEZKUWswZ1JYWmxiblFnVTNSeVpXRnRjekFlRncweE9UQTJNalV3TnpVdwpOVFphRncweU9UQTJNakl3TnpVd05UWmFNQ294RERBS0JnTlZCQW9UQTBsQ1RURWFNQmdHQTFVRUN4TVJTVUpOCklFVjJaVzUwSUZOMGNtVmhiWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRQy8KNzlvZ3ozQmtGVlovWFRMMVgrY0N5ejZ0L21BQzZYYzV1NFZsbmNOL2RoNktEaVVBTWErZDI5RHFZYjVkQ0RFdgp6ZlNUTUJWaFFqQTR5REdmNFBTWFFuU1p0VE90eHZBWDAvMlpkNXNHRWludU9pc29hbktWU2dzaXJqbEdYakNSCk80TUhiUVhzUVdsM2M2bHlIRW9GV2NPODViWWU2VXg1WFlZL1dOWTdoS01JaUxvNXRFRGZjbTRFeFZTK1JnaHoKcXN5UmVMKzE3aTZZRzJyRUV5OEJodTIvWmlPSEsrR0ZNRk85WkZab2p4U3lBdXVwUno2VktiL3h5cjc2cndBNwplM014bk9ORzJXamlpakhuWUJ2c00vM1Fwd0dmUHlEKzdQM0p2Y2RLK3VxYVFsYUR1UnpLNFNudS9NQXM2cGwzCnhqaHBQdzJaOHA2VU5vUkxVa29IQWdNQkFBR2pjREJ1TUE0R0ExVWREd0VCL3dRRUF3SUJwakFQQmdOVkhSTUIKQWY4RUJUQURBUUgvTUVzR0ExVWRFUVJFTUVLQ0NXUmlZVzFqTG1samNJSXBaR0poYldNdWFXTndMbVYyWlc1MApMWE4wY21WaGJYTXVjM1pqTG1Oc2RYTjBaWEl1Ykc5allXeUhCS3dRTk5lSEJLd1FOTmd3RFFZSktvWklodmNOCkFRRUxCUUFEZ2dFQkFFZ3YyZmVZSVlVZ3RPSDlKeC9XQk94NXBxbGRBVmVlajd5aHUwbG5BZkFyY1dqc2JUd1kKMURlYjVicHAzV2hEOUpmVkZFcHA5UWZOd2xGNDFIZlN1SjkwTFd3YjFjTTF2MnhKaExYSkhPSlNkdklESExUVQpjNXh3cmZMcExHRFVFZkRmTzB5eUN3YzFRMkx4ZW9LT0ZUNzNOUVRudUgyMXRnS1QxdzFsZzFmWUVuVUVOMTRECk85VGlmc05RRmtINjRoczRNVHJ1VVN5alc1SUxzT0dIeW9jY0ZvRXFrbTlJSUJPR1Buc2gyWURJSGdDbnczdnEKZVN0TWFydFVPbHBrbVBDRnNqakVHUW5mczI0dnE3YkF4aVBNdXA2bW1UOGtZM2ZJazYyKzNZMmM2aG5JMGIzRAp4ZnhXaFNVTFNLenhrOEFkQ0V4TTNpdEJ5NE8weTlUeDIwbz0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
```

### Create IBM Event Streams topics
Create three topics:
* `event-streams-test1-ibm-bai-ingress`
* `event-streams-test1-ibm-bai-egress` (optional only used if you set egress settings to true in BAI installation)
* `event-streams-test1-ibm-bai-service`

### Get IBM Event Streams Bootstrap servers
- bootstrap: 172.16.52.216:32254
- brk0: 172.16.52.216:31027
- brk1: 172.16.52.216:31571
- brk2: 172.16.52.216:30457

## Installing
```
ansible-playbook install.yaml -i inventory
```
## Uninstalling
```
ansible-playbook uninstall.yaml -i inventory
```