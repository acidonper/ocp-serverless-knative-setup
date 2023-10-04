# Deploy an APP with KafkaSource

In this section, it is included a procedure to deploy an event-driven architecture and a specific application that will make use of this solution. The idea is to deploy an application that receives events from a Kafka Topic automatically.

The following components will be deployed following the procedures included in this section:

- A Kafka Topic that host cloud events primary
- A namespace where the scenario will be deployed (Named __kafkasource-kafka-broker-app__)
- A Kafka source that reads events from a Kafka Topic and generate an event in Knative
- An application that will receive these event notifications (In this case, knative application)
- A __Knative Service__ (Test App) that receive events from the *Knative Source* 

> NOTE: It is important to keep in mind that Knative Serving has to be deployed in order to deploy this use case

## Prerequisites

- AMQ Streams Operator
- AMQ Streams Architecture
- Knative Eventing for Apache Kafka

## Setting Up

- Create the respective App Namespace

```$bash
oc apply -f files/kafkasource/serverless-eventing-kafkasource-ns.yaml
```

- Create the Kafka topic in order to consume events automatically

```$bash
oc apply -f files/kafkasource/amq-kafkatopic.yaml
```

- Create the respective kafka service that receives the events

```$bash
oc apply -f files/kafkasource/serverless-eventing-kafka-app.yaml
```

- Create the respective kafkasource that allows Knative to obtain events from a Kafka Topic and inject them to the app created

```$bash
oc apply -f files/kafkasource/serverless-eventing-kafka-source.yaml
```

- Generate a cloud event manually via the Kafka Topic

```$bash
oc -n amq-streams  exec -it my-cluster-kafka-0 -- bin/kafka-console-producer.sh --topic knative-kafka-source --bootstrap-server my-cluster-kafka-bootstrap:9092
...
{"msg": "Hello Knative Eventing from KafkaSource!"}
...
```

- Verify example application logs (*kafka service that receives the events)

```$bash
oc logs $(oc get pod -o name -n kafkasource-kafka-broker-app | grep event-display ) -c user-container -n kafkasource-kafka-broker-app
...
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: dev.knative.kafka.event
  source: /apis/v1/namespaces/kafkasource-kafka-broker-app/kafkasources/kafkasource-kafka-broker-app#knative-kafka-source
  subject: partition:2#1
  id: partition:2/offset:1
  time: 2023-10-03T10:20:41.274Z
Data,
  {"msg": "Hello Knative Eventing from KafkaSource!"}
...
```
