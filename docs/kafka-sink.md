# Deploy an APP with KafkaSink

In this section, it is included a procedure to deploy an event-driven architecture. The idea is to create a Kafka Connector that receives HTTP requests and translate then to events that will save into a Kafka Topic automatically.

The following components will be deployed following the procedures included in this section:

- A Kafka Topic that host cloud events generated
- A namespace where the scenario will be deployed (Named __kafkasource-kafka-broker-app__)
- A __Kafka Sink__ that receives HTTP events in order to save them into a Kafka Topic

## Prerequisites

- AMQ Streams Operator
- AMQ Streams Architecture
- Knative Eventing for Apache Kafka

## Setting Up

- Create the respective App Namespace

```$bash
oc apply -f files/kafkasink/serverless-eventing-ns.yaml
```

- Create the Kafka topic in order to consume events automatically

```$bash
oc apply -f files/kafkasink/amq-kafkatopic.yaml
```

- Create the respective kafkasink that allows Knative to receive HTTP events in order to save them into a Kafka Topic

```$bash
oc apply -f files/kafkasink/serverless-eventing-kafka-sink.yaml
```

- Generate a cloud event manually via HTTP

```$bash
bash-4.4$ curl -v "http://kafka-sink-ingress.knative-eventing.svc.cluster.local/kafkasink-kafka-broker-app/my-kafka-sink" \
  -X POST \
  -H "Ce-Id: say-hello" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-type: event-display-2" \
  -H "Ce-Source: curl-pod" \
  -H "Content-Type: application/json" \
  -d '{"msg":"Hello Knative Eventing from Kafka Sink!"}'
```

- Verify kafka topic events generated

```$bash
oc -n amq-streams  exec -it my-cluster-kafka-0 -- bin/kafka-run-class.sh kafka.tools.GetOffsetShell --topic knative-kafka-sink --broker-list my-cluster-kafka-bootstrap:9092 | awk -F  ":" '{sum += $3} END {print "Result: "sum}'
...
Result: 1
...
```
