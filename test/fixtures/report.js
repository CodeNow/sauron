module.exports = {
    "Version": "1.4.1",
    "Router": {
        "Protocol": "weave",
        "ProtocolMinVersion": 1,
        "ProtocolMaxVersion": 2,
        "Encryption": false,
        "PeerDiscovery": true,
        "Name": "06:d9:13:68:49:1d",
        "NickName": "ip-10-4-142-84",
        "Port": 6783,
        "Peers": [
            {
                "Name": "42:23:27:ab:ad:59",
                "NickName": "ip-10-4-140-85",
                "UID": 16185570645536730095,
                "ShortID": 1901,
                "Version": 10,
                "Connections": [
                    {
                        "Name": "06:d9:13:68:49:1d",
                        "NickName": "ip-10-4-142-84",
                        "Address": "10.4.142.84:37345",
                        "Outbound": false,
                        "Established": true
                    },
                    {
                        "Name": "e2:24:40:6b:71:33",
                        "NickName": "ip-10-4-147-213",
                        "Address": "10.4.147.213:42648",
                        "Outbound": false,
                        "Established": true
                    }
                ]
            },
            {
                "Name": "06:d9:13:68:49:1d",
                "NickName": "ip-10-4-142-84",
                "UID": 4907105962903254792,
                "ShortID": 170,
                "Version": 7,
                "Connections": [
                    {
                        "Name": "e2:24:40:6b:71:33",
                        "NickName": "ip-10-4-147-213",
                        "Address": "10.4.147.213:44576",
                        "Outbound": false,
                        "Established": true
                    },
                    {
                        "Name": "42:23:27:ab:ad:59",
                        "NickName": "ip-10-4-140-85",
                        "Address": "10.4.140.85:6783",
                        "Outbound": true,
                        "Established": true
                    }
                ]
            },
            {
                "Name": "e2:24:40:6b:71:33",
                "NickName": "ip-10-4-147-213",
                "UID": 12651697573043078582,
                "ShortID": 1221,
                "Version": 4,
                "Connections": [
                    {
                        "Name": "06:d9:13:68:49:1d",
                        "NickName": "ip-10-4-142-84",
                        "Address": "10.4.142.84:6783",
                        "Outbound": true,
                        "Established": true
                    },
                    {
                        "Name": "42:23:27:ab:ad:59",
                        "NickName": "ip-10-4-140-85",
                        "Address": "10.4.140.85:6783",
                        "Outbound": true,
                        "Established": true
                    }
                ]
            }
        ],
        "UnicastRoutes": [
            {
                "Dest": "06:d9:13:68:49:1d",
                "Via": "00:00:00:00:00:00"
            },
            {
                "Dest": "e2:24:40:6b:71:33",
                "Via": "e2:24:40:6b:71:33"
            },
            {
                "Dest": "42:23:27:ab:ad:59",
                "Via": "42:23:27:ab:ad:59"
            }
        ],
        "BroadcastRoutes": [
            {
                "Source": "42:23:27:ab:ad:59",
                "Via": null
            },
            {
                "Source": "06:d9:13:68:49:1d",
                "Via": [
                    "e2:24:40:6b:71:33",
                    "42:23:27:ab:ad:59"
                ]
            },
            {
                "Source": "e2:24:40:6b:71:33",
                "Via": null
            }
        ],
        "Connections": [
            {
                "Address": "10.4.147.213:44576",
                "Outbound": false,
                "State": "established",
                "Info": "sleeve e2:24:40:6b:71:33(ip-10-4-147-213)"
            },
            {
                "Address": "10.4.140.85:6783",
                "Outbound": true,
                "State": "established",
                "Info": "sleeve 42:23:27:ab:ad:59(ip-10-4-140-85)"
            },
            {
                "Address": "10.4.145.68:6783",
                "Outbound": true,
                "State": "failed",
                "Info": "dial tcp4 10.4.145.68:6783: no route to host, retry: 2016-01-12 19:20:33.775154622 +0000 UTC"
            }
        ],
        "Targets": [
            "10.4.145.68",
            "10.4.140.85"
        ],
        "OverlayDiagnostics": {
            "fastdp": {
                "Vports": [
                    {
                        "ID": 0,
                        "Name": "datapath",
                        "TypeName": "internal"
                    },
                    {
                        "ID": 1,
                        "Name": "vethwe-datapath",
                        "TypeName": "netdev"
                    },
                    {
                        "ID": 2,
                        "Name": "vxlan-6784",
                        "TypeName": "vxlan"
                    }
                ],
                "Flows": []
            },
            "sleeve": null
        },
        "TrustedSubnets": [],
        "Interface": "datapath (via ODP)",
        "CaptureStats": {
            "FlowMisses": 62
        },
        "MACs": [
            {
                "Mac": "4a:63:f3:c5:7b:ab",
                "Name": "06:d9:13:68:49:1d",
                "NickName": "ip-10-4-142-84",
                "LastSeen": "2016-01-12T19:15:31.46745298Z"
            },
            {
                "Mac": "ce:ed:03:d1:3a:68",
                "Name": "e2:24:40:6b:71:33",
                "NickName": "ip-10-4-147-213",
                "LastSeen": "2016-01-12T19:18:18.671136252Z"
            },
            {
                "Mac": "e2:24:40:6b:71:33",
                "Name": "e2:24:40:6b:71:33",
                "NickName": "ip-10-4-147-213",
                "LastSeen": "2016-01-12T19:18:18.906791362Z"
            },
            {
                "Mac": "ca:08:6e:78:b5:27",
                "Name": "e2:24:40:6b:71:33",
                "NickName": "ip-10-4-147-213",
                "LastSeen": "2016-01-12T19:18:18.910695484Z"
            },
            {
                "Mac": "96:5d:f3:35:ef:28",
                "Name": "42:23:27:ab:ad:59",
                "NickName": "ip-10-4-140-85",
                "LastSeen": "2016-01-12T19:13:05.427744901Z"
            }
        ]
    },
    "IPAM": {
        "Paxos": null,
        "Range": "10.21.0.0-10.21.255.255",
        "RangeNumIPs": 65536,
        "DefaultSubnet": "10.21.0.0/16",
        "Entries": [
            {
                "Token": "10.21.0.0",
                "Size": 1,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 5
            },
            {
                "Token": "10.21.0.1",
                "Size": 1,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 288
            },
            {
                "Token": "10.21.0.2",
                "Size": 31920,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 11
            },
            {
                "Token": "10.21.124.178",
                "Size": 846,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 2
            },
            {
                "Token": "10.21.128.0",
                "Size": 8192,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 66
            },
            {
                "Token": "10.21.160.0",
                "Size": 4095,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 434
            },
            {
                "Token": "10.21.175.255",
                "Size": 4096,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 18
            },
            {
                "Token": "10.21.191.255",
                "Size": 1,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 327
            },
            {
                "Token": "10.21.192.0",
                "Size": 8191,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 6
            },
            {
                "Token": "10.21.223.255",
                "Size": 4096,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 46
            },
            {
                "Token": "10.21.239.255",
                "Size": 1025,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 14
            },
            {
                "Token": "10.21.244.0",
                "Size": 1024,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 23
            },
            {
                "Token": "10.21.248.0",
                "Size": 258,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 25
            },
            {
                "Token": "10.21.249.2",
                "Size": 64,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 76
            },
            {
                "Token": "10.21.249.66",
                "Size": 18,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 54
            },
            {
                "Token": "10.21.249.84",
                "Size": 15,
                "Peer": "06:d9:13:68:49:1d",
                "Nickname": "ip-10-4-142-84",
                "IsKnownPeer": true,
                "Version": 18
            },
            {
                "Token": "10.21.249.99",
                "Size": 5,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 21
            },
            {
                "Token": "10.21.249.104",
                "Size": 4,
                "Peer": "42:23:27:ab:ad:59",
                "Nickname": "ip-10-4-140-85",
                "IsKnownPeer": true,
                "Version": 11
            },
            {
                "Token": "10.21.249.108",
                "Size": 7,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 7
            },
            {
                "Token": "10.21.249.115",
                "Size": 15,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 7
            },
            {
                "Token": "10.21.249.130",
                "Size": 128,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 61
            },
            {
                "Token": "10.21.250.2",
                "Size": 510,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 14
            },
            {
                "Token": "10.21.252.0",
                "Size": 1023,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 15
            },
            {
                "Token": "10.21.255.255",
                "Size": 1,
                "Peer": "b2:88:af:6b:2a:d5",
                "Nickname": "ip-10-4-145-68",
                "IsKnownPeer": false,
                "Version": 4
            }
        ],
        "PendingClaims": null,
        "PendingAllocates": null
    }
}
