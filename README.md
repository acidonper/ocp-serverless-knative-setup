# Red Hat Openshift Serverless Architecture Design and Setup

OpenShift Serverless provides Kubernetes native building blocks that enable developers to create and deploy serverless, event-driven applications on OpenShift Container Platform. OpenShift Serverless is based on the open source Knative project, which provides portability and consistency for hybrid and multi-cloud environments by enabling an enterprise-grade serverless platform.

## Environment

- Openshift 4.13+
- serverless-operator.v1.29.0+

## Knative Serving

### Introduction

Knative Serving defines a set of objects (CRDs) described below to define and control a serverless architecture that supports both HTTP and HTTPS networking protocols.

![Knative Serving Objects](./images/knative-serving.png)

- __Service__: manages the life cycle of your workload to ensure that the application is deployed and reachable through the network. It creates a route, a configuration, and a new revision for each change to an user created service.
- __Revision__: point-in-time and immutable snapshot of the code and configuration for each modification made to the workload.
- __Route__: maps a network endpoint to one or more revisions.
- __Configuration__: maintains the desired state for your deployment, and it provides a clean separation between code and configuration.

Regarding the components that compose the Knative architecture, the following picture shows them including their interaction workflow:

![Knative Serving Architecture](./images/serving-architecture.png)

- __Activator__: It is responsible to queue incoming requests (if a Knative Service is scaled-to-zero) and acts as a request buffer to handle traffic bursts.
- __Autoscaler__: The autoscaler is responsible to scale the Knative Services based on configuration, metrics and incoming requests.
- __Controller__: It watches several objects, manages the lifecycle of dependent resources, and updates the resource state.
- __Queue-Proxy__: The Queue-Proxy is a sidecar container in the Knative Service's Pod. It is responsible to collect metrics and enforcing the desired concurrency when forwarding requests to the user's container. It can also act as a queue if necessary, similar to the Activator.
- __Webhooks__: Knative Serving has several webhooks responsible to validate and mutate Knative Resources.

Regarding HTTP and HTTPS request, it is important to understand how each request is handle by Knative:

![Knative Serving Requests Flow](./images/request-flow.png)

Additionally, Openshift Serverless installs a set of components to implement the HTTP Router abstracting customers to this required solution. 

![Openshift Serving Requests Flow](./images/request-flow-ocp.png)

> NOTE: In order to be able to troubleshoot ingress connections, it is possible to configure access logs in the Openshift default router applying the configuration included in the file *files/router-access-log-enable.yaml*.

It is also keep in mind the following information about load balancing:

- Activator pods are scaled horizontally, so there may be multiple Activators in a deployment.


### Setup Knative Serving

- Install Serverless Operator

```$bash
oc apply -f files/serverless-subscription.yaml
```

- Install Knative Serving Architecture

```$bash
oc apply -f files/serverless-serving.yaml
```

- Review the installation

```$bash
oc get pods -n knative-serving
oc get pods -n knative-serving-ingress
```

### Deploy an APP using Knative Serving

[link](./docs/knative-serving.md)

## Knative Eventing

### Introducction

Knative Eventing on OpenShift Container Platform enables developers to use an event-driven architecture with serverless applications. An event-driven architecture is based on the concept of decoupled relationships between event producers and event consumers.

Event producers create events, and event sinks, or consumers, receive events. Knative Eventing uses standard HTTP POST requests to send and receive events between event producers and sinks. These events conform to the CloudEvents specifications, which enables creating, parsing, sending, and receiving events in any programming language.

Knative Eventing supports the following use cases:

- Publish an event without creating a consumer
- Consume an event without creating a publisher

Currently, OpenShift Serverless supports the following event source types:

- __API server source__: Brings Kubernetes API server events into Knative
- __Ping source__: Produces events with a fixed payload on a specified cron schedule
- __Kafka event source__: Connects an Apache Kafka cluster to a sink as an event source.

> NOTE: It is possible to create custom event sources

Regarding functional point of view, the following list includes the main components in an event-driven architecture:

- __Event source__: it can be any Kubernetes object that generates or imports cloud events, and relays those events to another endpoint, known as a sink. Sourcing events is critical to developing a distributed system that reacts to events.

![Knative Eventing Architecture](./images/eventing-architecture.png)

- __Brokers__: it can be used in combination with triggers to deliver events from an event source to an event sink. Knative provides a default, channel-based broker implementation. This channel-based broker can be used for development and testing purposes, but does not provide adequate event delivery guarantees for production environments. The default broker is backed by the InMemoryChannel channel implementation by default.

- __Triggers__: After events have entered the broker, they can be filtered by CloudEvent attributes using triggers, and sent as an HTTP POST request to an event sink.

- __Event sink__: An event sink is an addressable or a callable resource that can receive incoming events from other resources. Knative services, channels, and brokers are all examples of event sinks. There is also a specific Apache Kafka sink type available.

On the other hand, we have __Channel and Subscriptions__ that tend to involve a linear flow of events (a "pipeline" of processing), where it is possible to end up provisioning a new Channel and Subscription for each stage of processing. At each stage, the generated events are broadcast to all the downstream Subscriptions on the Channel, and there's no "smarts" in the event-transport layer.

![Knative Channel and Subscriptions Workflow](./images/channel-workflow.png)

- __Channel__: Channels are custom resources that define a single event-forwarding and persistence layer. After events have been sent to a channel from an event source or producer, these events can be sent to multiple Knative services or other sinks by using a subscription (Available in OCP are _*InMemoryChannel and KafkaChannel_)

- __Subcription__: After you have created a channel and an event sink, you can create a subscription to enable event delivery


### Setup Knative Eventing

- Install Serverless Operator

```$bash
oc apply -f files/serverless-subscription.yaml
```

- Install Knative Eventing Architecture

```$bash
oc apply -f files/serverless-eventing.yaml
```

- Review the installation

```$bash
# Verify Installation
oc get knativeeventing.operator.knative.dev/knative-eventing \
  -n knative-eventing \
  --template='{{range .status.conditions}}{{printf "%s=%s\n" .type .status}}{{end}}'

# Review Knative Eventing Pods
oc get pods -n knative-eventing
```

### Deploy an APP (*Kafka Broker not Secured)

[link](./docs/knative-kafka-broker.md)

### Deploy an APP (*Kafka Broker Secured)

[link](./docs/knative-kafka-broker-sec.md)

### Deploy a Kafka Sink (Abstract Kafka event subscriptors)

[link](./docs/kafka-sink.md)

### Deploy a Kafka Source (Abstract Kafka event publishers)

[link](./docs/kafka-source.md)

### Deploy an API Server Source APP (*InMemoryChannel)

[link](./docs/api-service-inmemory.md)

### Deploy an APP (*Kafka Channel)

[link](./docs/kafka-channel.md)

## Links

- [Openshift Serverless Performance Tests](https://docs.openshift.com/serverless/1.29/install/preparing-serverless-install.html#about-serverless-scalability-performance)
- [Configuring Ingress access logging in Openshift Router](https://docs.openshift.com/container-platform/4.13/networking/ingress-operator.html#nw-configure-ingress-access-logging_configuring-ingress)
- [Openshift Serverless KnativeServing CRD](https://github.com/openshift-knative/serverless-operator/blob/main/olm-catalog/serverless-operator/manifests/operator_v1beta1_knativeserving_crd.yaml)
- [Openshift Serverless KnativeServing Autoscaling Configuration](https://docs.openshift.com/serverless/1.29/knative-serving/autoscaling/serverless-autoscaling-developer.html)
- [Multi-tenant channel-based broker (MTChannelBasedBroker) architecture](https://github.com/knative/eventing/tree/main/docs/mt-channel-based-broker)
- [Openshift Serverless KnativeEventing Kafka Broker Installation](https://docs.openshift.com/serverless/1.29/install/installing-knative-eventing.html#serverless-install-kafka-odc_installing-knative-eventing)
- [Configure Broker defaults](https://knative.dev/docs/eventing/configuration/broker-configuration/)


#### Troubleshooting in AMQ Streams

The following procedures are useful in order to troubleshoot problems in AMQ Streams with topics and messages.

##### Generate an event manually

```$bash
oc -n amq-streams  exec -it my-cluster-kafka-0 -- bin/kafka-console-producer.sh --topic knative-broker-kafka-broker-app-kafka-broker-app --bootstrap-server my-cluster-kafka-bootstrap:9092
...
Hello kafka-broker-app 
...
```

> NOTE: It is required to exit the producer console with "crtl + c"

##### Show number of events in a topic manually (*Optional)

```$bash
oc -n amq-streams  exec -it my-cluster-kafka-0 -- bin/kafka-run-class.sh kafka.tools.GetOffsetShell --topic knative-broker-kafka-broker-app-kafka-broker-app --broker-list my-cluster-kafka-bootstrap:9092 | awk -F  ":" '{sum += $3} END {print "Result: "sum}'
...
Result: 1
...
```

## Author

Asier Cidon @RedHat
David Severiano @RedHat
