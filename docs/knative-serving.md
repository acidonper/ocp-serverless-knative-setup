

## Deploy HelloWorld App

- Deploy a HelloWorld application

```$bash
oc apply -f files/serverless-hello-app.yaml
```

- Test HelloWorld Application Deployment

```$bash
# Check Knative Service
$ oc get ksvc hello-app -n hello-app

# Check Configuration Generated 
$ oc get configurations.serving.knative.dev hello-app -n hello-app

# Check revisions
$ oc get revisions.serving.knative.dev -n hello-app

# Check Router
$ oc get routes.serving.knative.dev hello-app -n hello-app

# Check HTTP service
$ URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ curl $URL -k
Hello Go Sample v1!
```

## Knative Serving Autoscaling System
https://github.com/knative/serving/blob/main/docs/scaling/SYSTEM.md

## Knative autoscaling tests

Once the hello world application is deployed, it is possible to define a set of different configurations in order to control the performance of the application modifying the total request received per replica among other things.

The idea in this section is playing with different configurations and observe the Application and Knative solution performance.

- 50 Virtual Users during 30 seconds (Solved by 1 microservice by default because default container-concurrency-target-default: "200")

```$bash
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 50 --duration 30s testing/k8-load-test-simple.js
```

### Configuring concurrency
- 50 Virtual Users during 30 seconds with a limit of 25 simultaneous requests (Solved by 2 microservice)

```$bash
# Define request limits
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/target":"25"}}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 50 --duration 30s testing/k8-load-test-simple.js
```

- 100 Virtual Users during 30 seconds with a limit of 25 simultaneous requests (Solved by 4 microservice)

```$bash
# Define request limits
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/target":"25"}}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 100 --duration 30s testing/k8-load-test-simple.js
```

- 25 Virtual Users during 30 seconds with a **hard** limit of 25 simultaneous requests and scale with 80%, it means as of 20 request per pod (Solved by 2 microservice)

```$bash
# Define hard limits
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/target-utilization-percentage":"80"}}}}}' --type='merge'
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"spec":{"containerConcurrency":25}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 25 --duration 30s testing/k8-load-test-simple.js
```

### Configuring max scale
- 500 Virtual Users during 10 seconds with max scale 5, it means that several pods will be needed but the application will only scale to 5.

```$bash
# Define max scale
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/max-scale": "5"}}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 500 --duration 10s testing/k8-load-test-simple.js
```

### Configuring stable window
- 25 Virtual Users during 10 seconds with stable window to 10s, it means that after 10s metrics are averaged to provide the input for scaling decisions. We will see that pods are terminated faster.

```$bash
# Define stable window
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/window": "10s"}}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 25 --duration 10s testing/k8-load-test-simple.js
```
### Configuring cluster local

- When a service can not public so that it is not published to the external gateway. We can label it as cluster-local


```$bash
# Change to cluster local
kubectl label kservice/hello-app networking.knative.dev/visibility=cluster-local -n hello-app

# Check HTTP service
$ URL-ERROR=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ curl $URL-ERROR -k
curl: (6) Could not resolve host: hello-app.hello-app.svc.cluster.local

```

> NOTE: It is possible to configure Request per Seconds (RPS) policies, additional autoscaling providers, min and max replicas, scale to zero rules, scaling windows, and other strategies, please review autoscaling documentation https://knative.dev/docs/serving/autoscaling/autoscaler-types/#example-of-the-default-autoscaling-configmap
### Delete the hello-app Knative service
```$bash
oc delete -f files/serverless-hello-app.yaml
```


## Knative traffic management tests

By default, Knative sends 100% traffic to the latest revision by setting `latestRevision: true` in the spec for a Service. To asigned different amount of traffic to the revisions it is highly recommended to add names to de revisions.

- This yaml file will create a new Knative service with the revision name `hello-app-traffic-v1`. We have also added the `tag: stable` to this revision. When a tag attribute is applied to a Route, an address for the specific traffic target is created.
  
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-app-traffic
  namespace: hello-app
spec:
  template:
    metadata:
      name: hello-app-traffic-v1  <-- Revision name
    spec:
      containers:
      - image: quay.io/openshift-knative/helloworld-go
        env:
        - name: TARGET
          value: "Go Sample v1"
  traffic:
  - percent: 100
    revisionName: hello-app-traffic-v1
    tag: stable
```

### Deploy HelloWorld App

- Deploy a HelloWorld application

```$bash
oc apply -f files/serverless-hello-app-traffic.yaml
```

- Test HelloWorld Application Deployment

```$bash
# Check Knative Service
$ oc get ksvc hello-app-traffic -n hello-app

# Check Configuration Generated 
$ oc get configurations.serving.knative.dev hello-app-traffic -n hello-app

# Check revisions
$ oc get revisions.serving.knative.dev -n hello-app

# Check Router
$ oc get routes.serving.knative.dev hello-app-traffic -n hello-app

# Check HTTP service
$ URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ echo $URL
$ curl $URL -k
Hello Go Sample v1!

# Check stagin HTTP service
$ URL_STABLE=$(oc get ksvc -o jsonpath='{.items[0].status.traffic[0].url}' -n hello-app)
$ echo $URL_STABLE
$ curl $URL_STABLE -k
Hello Go Sample v1!
```

Now we are going to deploy application V2, because we don't know if it is stable we will send 0% traffic. 

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-app-traffic
  namespace: hello-app
spec:
  template:
    metadata:
      name: hello-app-traffic-v2
    spec:
      containers:
      - image: quay.io/openshift-knative/helloworld-go
        env:
        - name: TARGET
          value: "Go Sample v2"
  traffic:
  - percent: 100
    revisionName: hello-app-traffic-v1
    tag: stable
  - percent: 0
    revisionName: hello-app-traffic-v2
    tag: canary
```

- Deploy a HelloWorld application V2

```$bash
oc apply -f files/serverless-hello-app-traffic-v2.yaml
```

- Test HelloWorld Application V2 Deployment

```$bash
# Check Knative Service
$ oc get ksvc hello-app-traffic -n hello-app

# Check revisions
$ oc get revisions.serving.knative.dev -n hello-app

# Check Router
$ oc get routes.serving.knative.dev hello-app-traffic -n hello-app

# Check HTTP service
$ URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ echo $URL
$ curl $URL -k
Hello Go Sample v1!

# Check stable HTTP service
$ URL_STABLE=$(oc get ksvc -o jsonpath='{.items[0].status.traffic[0].url}' -n hello-app)
$ echo $URL_STABLE
$ curl $URL_STABLE -k
Hello Go Sample v1!

# Check canary HTTP service
$ URL_CANARY=$(oc get ksvc -o jsonpath='{.items[0].status.traffic[1].url}' -n hello-app)
$ echo $URL_CANARY
$ curl $URL_CANARY -k
Hello Go Sample v2!
```

After that, we can change the percentage of traffic that is sent to stable and canary to 50% of traffic per each.

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-app-traffic
  namespace: hello-app
spec:
  template:
    metadata:
      name: hello-app-traffic-v2
    spec:
      containers:
      - image: quay.io/openshift-knative/helloworld-go
        env:
        - name: TARGET
          value: "Go Sample v2"
  traffic:
  - percent: 50
    revisionName: hello-app-traffic-v1
    tag: stable
  - percent: 50
    revisionName: hello-app-traffic-v2
    tag: canary
```

```$bash
oc patch ksvc hello-app-traffic -n hello-app --patch-file files/serverless-hello-app-traffic-v2-parch.yaml --type=merge
```

- Test HelloWorld Application V2 Deployment with 50% per each revision

```$bash
# Check HTTP service
$ URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ echo $URL

# Execute this curl several times and you will see how it change to each revision.
$ curl $URL -k
Hello Go Sample v1!
$ curl $URL -k
Hello Go Sample v2!
```

### Delete the hello-app-traffic Knative service
```$bash
oc delete -f files/serverless-hello-app-traffic.yaml
```

## Knative gradual rollout tests

By default, Knative sends 100% traffic to the latest revision by setting `latestRevision: true` in the spec for a Service. Knative provides a rollout-duration parameter, which can be used to gradually shift traffic to the latest Revision, preventing requests from being queued or rejected. Affected Configuration targets are rolled out to 1% of traffic first, and then in equal incremental steps for the rest of the assigned traffic.

- This yaml file will create a new Knative service with the annotation `serving.knative.dev/rollout-duration` set to 60s. We will see how gradually the traffic shift from the previous version to the new version
  
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-app-rollout
  namespace: hello-app
  annotations:
    serving.knative.dev/rollout-duration: "60s"  <-- Rollout duration
spec:
  template:
    spec:
      containers:
      - image: quay.io/openshift-knative/helloworld-go
        env:
        - name: TARGET
          value: "Go Sample v1"
```

### Deploy HelloWorld App

- Deploy a HelloWorld application

```$bash
oc apply -f files/serverless-hello-app-rollout.yaml
```

- Test HelloWorld Application Deployment

```$bash
# Check Knative Service
$ oc get ksvc hello-app-rollout -n hello-app

# Check Configuration Generated 
$ oc get configurations.serving.knative.dev hello-app-rollout -n hello-app

# Check revisions
$ oc get revisions.serving.knative.dev -n hello-app

# Check Router
$ oc get routes.serving.knative.dev hello-app-rollout -n hello-app

# Check HTTP service
$ URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
$ echo $URL
$ curl $URL -k
Hello Go Sample v1!
```

Now we are going to deploy application V2.

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-app-rollout
  namespace: hello-app
  annotations:
    serving.knative.dev/rollout-duration: "60s"
spec:
  template:
    spec:
      containers:
      - image: quay.io/openshift-knative/helloworld-go
        env:
        - name: TARGET
          value: "Go Sample v2"
```

- Deploy a HelloWorld application V2 and quickly execute the tests

```$bash
oc apply -f files/serverless-hello-app-rollout-v2.yaml
```

- Test HelloWorld Application V2 Deployment
```$bash
# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 5 --duration 60s testing/k8-load-test-simple.js
```

### Delete the hello-app-rollout Knative service
```$bash
oc delete -f files/serverless-hello-app-rollout.yaml
```

## Cluster local availability (privete services)

By default, Knative services are published to a public IP address. 

- Set private visibility for your service by adding the `networking.knative.dev/visibility=cluster-local` label:

```$bash
oc label ksvc <service_name> networking.knative.dev/visibility=cluster-local
```

- Default configuration can be changes to create Knative service private by default. Anfortunaly currently there is an issue in the Serverless Operator and this is not supported.
  Issue: https://issues.redhat.com/browse/SRVKS-1154
  GitHub pull request: https://github.com/openshift-knative/serverless-operator/pull/2305

- When this issue is fixed, we  have to change the configmap config-domain.
  
```$bash
oc get cm config-domain -n knative-serving -o=yaml
```

- Change it to:

```yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec:
  config:
    domain:
      svc.cluster.local: ''    
      mycluster.sandbox577.opentlc.com: |
        selector:
          expose: route-public
```


- Deploy a HelloWorld application

```$bash
oc apply -f files/serverless-hello-app-public.yaml
```

Here you can read the [documentation](https://master--knative.netlify.app/development/serving/cluster-local-route/).

## Garbage collection

We are going to change the garbage collection configuration to only retein 1 non active revision.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-gc
  namespace: knative-serving
data:
  retain-since-create-time: "disabled"
  retain-since-last-active-time: "disabled"
  max-non-active-revisions: "1"
  min-non-active-revisions: "0"
```

```$bash
oc apply -f files/sserverless-serving-config-gc.yaml
```

Here you can read the [documentation](https://knative.dev/docs/serving/revisions/revision-admin-config-options/#garbage-collection)
