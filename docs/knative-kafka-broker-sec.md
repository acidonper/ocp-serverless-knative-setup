# Deploy an APP (*Kafka Broker with Security)

In this section, it is included a procedure to deploy an event-driven architecture and a specific application that will make use of this solution. The idea is to implement Kafka as a Serverless default broker and deploy an application to test the event driven features.

The following components will be deployed following the procedures included in this section:

- A AMQ Streams architecture with SIMPLE authorization (*Kafka) 
- A Kafka User with SASL authentication enabled
- A namespace where the scenario will be deployed (Named __kafka-broker-app__)
- A pod that implement a __Knative Source__ via Curl generating CloudEvents based on headers
- A knative application that will receive event notifications (type -> event-display)
- A knative application that will receive event notifications (type -> event-display-2)
- A __Knative Broker__ that receives events from the *Knative Source* and deliver them to the respective *Knative Triggers* based on Kafka
- A set of __Knative Triggers__ that redirect the CloudEvents to the respective application deployed

> NOTE: It is important to keep in mind that Knative Serving has to be deployed in order to deploy this use case

Once it is clear the components that will be deployed, it is time to start executing the next procedure:

- Install AMQ Streams Operator

```$bash
oc apply -f files/amq-streams-subscription.yaml
```

- Deploy AMQ Streams Architecture with SIMPLE authorization (*kafka)

```$bash
oc apply -f files/kafka-sec/amq-streams-configure.yaml
```

- Review the AMQ Streams installations

```$bash
oc get pod -n amq-streams
NAME                                         READY   STATUS    RESTARTS   AGE
kafka-sec-entity-operator-dc555f7d5-xbh5v   3/3     Running   0          28m
kafka-sec-kafka-0                           1/1     Running   0          29m
kafka-sec-kafka-1                           1/1     Running   0          29m
kafka-sec-kafka-2                           1/1     Running   0          29m
kafka-sec-zookeeper-0                       1/1     Running   0          29m
kafka-sec-zookeeper-1                       1/1     Running   0          29m
kafka-sec-zookeeper-2                       1/1     Running   0          29m

```

- Create the AMQ Streams User with the respective password

```$bash
oc apply -f files/kafka-sec/kafkauser-secret.yaml
oc apply -f files/kafka-sec/kafkauser.yaml
```

Once the AMW Streams architecture is deployed, it is time to install the Knative Kafka Broker.

- Install the Knative Eventing for Apache Kafka

```$bash
oc apply -f files/serverless-eventing-knative-kafka.yaml
```

- Check Knative Kafka components

```$bash
# Check pods
oc get pod -n knative-eventing
...
kafka-broker-dispatcher-578d4c5d57-2vj46                       2/2     Running     0          3m42s
kafka-broker-receiver-7b97db4b65-p48tn                         2/2     Running     0          3m42s
kafka-channel-dispatcher-7554689668-snrf2                      2/2     Running     0          3m44s
kafka-channel-receiver-dbb7c987b-vbsvd                         2/2     Running     0          3m44s
kafka-controller-6bff7667f-4fc9m                               2/2     Running     0          3m47s
kafka-controller-post-install-1.29.1-xd2z5                     0/1     Completed   0          3m46s
kafka-sink-receiver-85b58dfc8f-qn67f                           2/2     Running     0          3m42s
kafka-webhook-eventing-78fdd8bd44-qqs9c                        2/2     Running     0          3m47s
knative-kafka-storage-version-migrator-1.29.1-gpd7r            0/1     Completed   0          3m46s
...
```

- Create the respective Knative Broker with specific configuration via Kafka

```$bash
NAME=kafka-sec-user
NAMESPACE=knative-eventing
USER=kafka-sec-user
PASSWORD=password
oc create secret --namespace ${NAMESPACE} generic ${NAME} \
  --from-literal=protocol=SASL_PLAINTEXT \
  --from-literal=sasl.mechanism=SCRAM-SHA-512 \
  --from-literal=user=${USER} \
  --from-literal=password=${PASSWORD}

oc apply -f files/kafka-sec/serverless-eventing-knative-broker-cm.yaml
oc apply -f files/kafka-sec/serverless-eventing-kafka-broker.yaml
```

- Check Kafka Broker topics created in the AMQ Streams solution

```$bash
oc -n amq-streams get kafkatopic
...
amq-streams   knative-broker-kafka-broker-sec-kafka-broker-sec                                                   kafka-sec    3            3                    True
...
```

- Create the trigger and the respective knative service that receives the events

```$bash
oc apply -f files/kafka-sec/serverless-eventing-kafka-app.yaml
oc apply -f files/kafka-sec/serverless-eventing-kafka-trigger.yaml
```

- Create a test app to generate cloud events

```$bash
oc apply -f files/kafka-sec/serverless-eventing-kafka-source.yaml
```

- Generate a cloud event manually via broker ingress

```$bash
POD=$(oc get pods --no-headers -n kafka-broker-sec | awk '{ print $1 }' | grep kafka-broker-sec-test)
oc -n kafka-broker-sec  exec -it $POD bash

bash-4.4$ curl -v "http://kafka-broker-ingress.knative-eventing.svc.cluster.local/kafka-broker-sec/kafka-broker-sec" \
  -X POST \
  -H "Ce-Id: say-hello" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: event-display" \
  -H "Ce-Source: curl-pod" \
  -H "Content-Type: application/json" \
  -d '{"msg":"Hello Knative Eventing from test pod - SEC TRIGGER 1!"}'
```

- Verify example application logs (*kafka service that receives the events)

```$bash
oc logs $(oc get pod -o name -n kafka-broker-sec | grep event-display ) -c user-container -n kafka-broker-sec
...
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: event-display
  source: curl-pod
  id: say-hello
  datacontenttype: application/json
Data,
  {
    "msg": "Hello Knative Eventing from test pod - SEC TRIGGER 1!"
  }
...
```
