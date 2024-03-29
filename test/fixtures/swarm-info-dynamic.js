'use strict'

module.exports = function (docks) {
  var numContainers = docks.reduce(function (prev, current) {
    return prev + (current.numContainers || 0)
  }, 0)

  var info = {
    ID: '',
    Containers: numContainers,
    Driver: '',
    SystemStatus: [
      [
        'Role',
        'primary'
      ],
      [
        'Strategy',
        'spread'
      ],
      [
        'Filters',
        'health, port, dependency, affinity, constraint'
      ],
      [
        'Nodes',
        docks.length + ''
      ]
    ],
    ExecutionDriver: '',
    Images: 431,
    KernelVersion: '',
    OperatingSystem: '',
    NCPU: 122,
    MemTotal: 536216742274,
    Name: '5fbc7bfe48ad',
    Labels: null,
    Debug: false,
    NFd: 0,
    NGoroutines: 0,
    SystemTime: '2016-02-02T02:20:22.113098268Z',
    NEventsListener: 0,
    InitPath: '',
    InitSha1: '',
    IndexServerAddress: '',
    MemoryLimit: true,
    SwapLimit: true,
    IPv4Forwarding: true,
    BridgeNfIptables: true,
    BridgeNfIp6tables: true,
    DockerRootDir: '',
    HttpProxy: '',
    HttpsProxy: '',
    NoProxy: ''
  }

  docks.forEach(function (dock) {
    info.SystemStatus.push([' ip-' + (dock.ip ? dock.ip.replace(/\./g, '-') : '10-8-192-11'), (dock.ip || '10.8.192.11') + ':4242'])
    info.SystemStatus.push(['  └ Status', dock.status || 'Healthy'])
    info.SystemStatus.push(['  └ Containers', dock.numContainers ? (dock.numContainers + '') : '0'])
    info.SystemStatus.push(['  └ Reserved CPUs', '0 / 2'])
    info.SystemStatus.push(['  └ Reserved Memory', '5.245 GiB / 8.187 GiB'])
    info.SystemStatus.push(['  └ Labels', 'executiondriver=native-0.2, kernelversion=3.13.0-74-generic, operatingsystem=Ubuntu 14.04.3 LTS, org=' + dock.org || 'testOrg' + ', storagedriver=aufs'])
    info.SystemStatus.push(['  └ Error', '(none)'])
    info.SystemStatus.push(['  └ UpdatedAt', '2016-03-04T01:56:02Z'])
    info.SystemStatus.push(['  └ ServerVersion', '1.10.2'])
  })

  return info
}
