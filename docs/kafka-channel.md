# Deploy an APP (*Kafka Channel)

In this section, it is included a procedure to deploy an event-driven architecture and a specific application that will make use of this solution. The idea is to implement Kafka as a Serverless default channel and deploy an application to test the event driven features.

The following components will be deployed following the procedures included in this section:

- An AMQ Streams architecture (*Kafka)
- A namespace where the scenario will be deployed (Named __event-app__)
- A pod that implement a __Knative Source__ via Curl generating CloudEvents based on headers
- An application that will receive these event notifications (In this case, knative application)
- A __Knative Channel__ that receive events from the *Knative Source* and deliver them to the respective *Knative Subscription* based on Kafka
- A __Knative Subscription__ that redirect the CloudEvents to the application deployed

> NOTE: It is important to keep in mind that create a route for a channel needs special configuration in the ingress.
> NOTE: It is important to keep in mind that Knative Serving has to be deployed in order to deploy this use case

Once it is clear the components that will be deployed, it is time to start executing the next procedure:

# Check configuration by default for channels
oc get cm kafka-channel-config -n knative-eventing
NAME                  DATA   AGE
kafka-channel-config   1      8m42s
```

- Create the respective Knative Channel via Kafka

```$bash
oc apply -f files/kafka-channel/serverless-eventing-kafka-channel.yaml
```

- Check Kafka channel topics created in the AMQ Streams solution

```$bash
oc get kafkatopic -n amq-streams | grep kafka-channel
...
knative-messaging-kafka.kafka-channel-app.kafka-channel
...
```

- Create the Subscription and the respective knative service that receives the events

oc apply -f files/kafka-channel/serverless-eventing-kafka-subscription.yaml

- Create a test app to generate cloud events

```$bash
oc apply -f files/kafka-channel/serverless-eventing-kafka-create-msg.yaml
``` 

- Generate a cloud event manually via channel ingress

```$bash
POD=$(oc get pods --no-headers -n kafka-channel-app | awk '{ print $1 }' | grep kafka-channel-app-test)
oc -n kafka-channel-app  exec -it $POD bash

bash-4.4$ curl -v "http://kafka-channel-kn-channel.kafka-channel-app.svc.cluster.local/kafka-channel-app/kafka-channel" \
  -X POST \
  -H "Ce-Id: say-hello" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: event-display" \
  -H "Ce-Source: curl-pod" \
  -H "Content-Type: application/json" \
  -d '{"msg":"Hello Knative Eventing from test pod!"}'
```

- Verify example application logs (*kafka service that receives the events)

```$bash
oc logs $(oc get pod -o name -n kafka-channel-app | grep event-display) -c user-container -n kafka-channel-app
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
    "msg": "Hello Knative Eventing from test pod!"
  }
...
```
