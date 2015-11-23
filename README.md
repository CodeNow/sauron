# Sauron
![Sauron](http://pre02.deviantart.net/2d95/th/pre/i/2013/121/3/7/sauron__the_lord_of_the_rings_by_eduardoleon-d63r0ir.png)

Sauron is the greatest and most trusted servant of Runnable during Two Point O.  After the downfall of his master, he continuously strove to conquer container networking.  Deceiving the developers, whom under his guidance created subnets, he secretly forged one virtual network to connect them all.  Hence, Sauron is deemed "The Lord of the Networks".

## Responsibilities
Sauron is in charge of adding an overlay network per org and giving each container a ip address. His primary Responsibilities include:

* Launching `weave` with correct peers obtained from Mavis
* Launching `weave` and restarting it if it dies
* Call `weave attach` on all started containers
* Emitting `container.network.attached` or `container.network.attach-failed` events

## Architecture
![Sauron Architecture](https://docs.google.com/drawings/d/1MrohwgRaQXmE6rmVZ6x2hdkHRGMis33Y0fciQBkbFXA/pub?w=959&h=209)

Sauron listens for container started events emitted from [docker-listener](https://github.com/CodeNow/docker-listener) on rabbitmq
Based on the event, Sauron runs `weave` commands then publishes `container.network.attached` events
If Sauron failed to attach for a fatal or some ignorable reason (container died, no container found)
, it will emit `container.network.attach-failed`
If Sauron failed to attach for a non-fatal reason, he retries

Sauron uses mavis to get peer information.

### Incoming events

#### container.life-cycle.started
This event is when a container has started.
In response we run `weave attach <containerId>` which adds the `ethwe` network interface to the container
If attach is successful `container.network.attached` event is published to rabbitmq
If attach is not successful `container.network.attach-failed` event is published

#### container.life-cycle.died
This event is when a container has died
In response we check to see if it is the weave container.
If it is we create `weave.start` command

### Commands

#### weave.start
This command is used to start a weave container on the dock

## Development

Sauron is designed to be developed against locally. In this section we will cover
how to setup your workstation to get a development server and tests running.

### Pull Requests
Sauron is a vital piece of our overall architecture. If we are unable to
attach networks to customer containers, users will have a bad experience with our product.
Since it is so important there are a few hard rules on what can and cannot be merged into master.

Before a pull request can be merged the following conditions must be met (so as
to mitigate problems in production):

1. All new code should follow the worker architecture
2. All functions should be heavily unit tested (every path should be tested)
3. Functional tests should be written for cross-module compatibility
4. The project should have 100% code coverage and tests should pass on circle
5. Project should be tested on `staging`

Once these steps have been followed, the PR should be merged and master should
be deployed on production ASAP.

### Setup

#### RabbitMQ
In order to fully test the codebase you will need to install RabbitMQ locally
on your machine. Run the following commands to do so:

* `brew update`
* `brew install rabbitmq`

Once installed, brew should instruct you on how to ensure that RabbitMQ is
launched at reboot and login. Copy the commands from the brew output and execute
them on your machine.

For more information see:
[RabbitMQ Homebrew Install Instructions](https://www.rabbitmq.com/install-homebrew.html)
