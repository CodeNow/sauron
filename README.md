# Sauron
========

Sauron is the greatest and most trusted servant of Runnable during Two Point O.  After the downfall of his master, he continuously strove to conquer container networking.  Deceiving the developers, whom under his guidance created subnets, he secretly forged one virtual network to connect them all.  Hence, Sauron is deemed "The Lord of the Networks".


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
  * add container to network, 2 methods:
    * reuse IP
      * must be given ip to reuse
      * give container specified IP
    * new IP
      * must be given org to connect to.
      * ORG is X, container in org is Y. 10.X.X.Y
      * look up redis to see what IP already given to org and pick a new one
      * give that IP to container
  * remove container from network
    * container: ipaddr removes container from ipaddr
