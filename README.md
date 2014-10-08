# Sauron
========

Sauron is the greatest and most trusted servant of Runnable during Two Point O.  After the downfall of his master, he continuously strove to conquer container networking.  Deceiving the developers, whom under his guidance created subnets, he secretly forged one virtual network to connect them all.  Hence, Sauron is deemed "The Lord of the Networks".


## Routes
* post /networks
  * allocate a network for a group of containers
  * return: { networkIp: 'ip.ip.ip.ip' }

* delete /networks/:networkIp
  * free a network
  * return: no content

* post /networks/:networkIp/hosts
  * allocate an ip address for a host on given network
  * return: { hostIp: 'ip.ip.ip.ip' }

* delete /networks/:networkIp/hosts/:hostIp
  * free an ip address for a host on given network
  * return: no content

* put /networks/:networkIp/hosts/:hostIp/actions/attach
  * attach allocated host ip to a container
  * return: no content

* put /networks/:networkIp/hosts/:hostIp/actions/detach
  * remove allocated host ip from a container
  * return: no content


## How He Works
* on startup:
  * Sauron checks to see if its dependencies are installed, they currently are:
    * weave
    * ethtool
    * conntrack
  * Sauron check to see if weave is already running
    * if running, start listening
    * if not:
      * query redis to see what ip's are in use
      * use unused ip, networks should use 10.0.0.X and link to other hosts
      * start listening

* when listening
  * alloc new network
    * look up redis to see what networks are taken pick a new one
  * alloc new host for given network
    * look up redis to see what IP already given to org and pick a new one
  * attach host to a container
    * run weave attach
  * free network
    * remove redis entry
  * free host
    * remove redis entry
  * remove host from container
    * run weave detach
