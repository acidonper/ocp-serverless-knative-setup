# Deploy an API Server Source APP (*InMemoryChannel)

In this section, it is included a procedure to deploy an Application that reads API Server events in a specific namespace. These events are generated in openshift and the following objects are required to deploy this example scenario:

- A namespace where the scenario will be deployed (Named __apiserver-app__)
- A service account with specific permissions to read events in this namespace (E.g. Pod creation, Pod deletion, etc)
- A __Knative Source__ that makes possible to consume Openshift events from the Knative architecture
- An application that will receive these event notifications (In this case, knative application)
- A __Knative Broker__ that receive events from the *Knative Source* and deliver them to the respective *Knative Trigger*
- A __Knative Trigger__ that redirect the API server event to the application deployed

In order to implement this scenario, please follow the next steps:

- Deploy a HelloWorld application

```$bash
oc apply -f files/serverless-eventing-apiserver-app.yaml
```

- Test the source, broker, trigger and application are deployed properly

```$bash
oc project apiserver-app

# Review the source
oc get apiserversource.sources.knative.dev testevents

# Review the broker
oc get broker default

# Review the trigger
oc get trigger event-display-trigger

# Review the application that reads events
oc get ksvc event-display
```

- Generate events and verify example application logs

```$bash
oc project apiserver-app

# Create a new deployment
oc create deployment hello-node --image=quay.io/openshift-knative/knative-eventing-sources-event-display

# Review the Application logs
oc logs $(oc get pod -o name | grep event-display) -c user-container
...
☁️  cloudevents.Event
Validation: valid
Context Attributes,
  specversion: 1.0
  type: dev.knative.apiserver.resource.add
  source: https://172.30.0.1:443
  subject: /apis/v1/namespaces/apiserver-app/events/hello-node-685495c99c-qx8z4.177f8ee7874cd1c7
  id: ff953a11-70da-400f-8b28-5c30f69976e5
  time: 2023-08-28T13:25:09.977123445Z
  datacontenttype: application/json
Extensions,
  kind: Event
  knativearrivaltime: 2023-08-28T13:25:09.977400891Z
  name: hello-node-685495c99c-qx8z4.177f8ee7874cd1c7
  namespace: apiserver-app
Data,
  {
    "apiVersion": "v1",
    "count": 1,
    "eventTime": null,
    "firstTimestamp": "2023-08-28T13:25:09Z",
    "involvedObject": {
      "apiVersion": "v1",
      "fieldPath": "spec.containers{knative-eventing-sources-event-display}",
...
```

> NOTE: Please review [InMemoryChannel](https://github.com/knative/eventing/blob/main/config/channels/in-memory-channel/README.md) for more information about the InMemoryChannel backing channel implemented by default using Knative native solution (Multi-tenant channel-based broker (MTChannelBasedBroker) architecture)
