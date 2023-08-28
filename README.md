# Red Hat Openshift Serverless Architecture Design and Setup

OpenShift Serverless provides Kubernetes native building blocks that enable developers to create and deploy serverless, event-driven applications on OpenShift Container Platform. OpenShift Serverless is based on the open source Knative project, which provides portability and consistency for hybrid and multi-cloud environments by enabling an enterprise-grade serverless platform.

## Environment

- Openshift 4.13+
- serverless-operator.v1.29.0

## Knative Serving

### Introduction

Knative Serving defines a set of objects (CRDs) described below to define and control a serverless architecture that supports both HTTP and HTTPS networking protocols.

- __Service__: manages the life cycle of your workload to ensure that the application is deployed and reachable through the network. It creates a route, a configuration, and a new revision for each change to an user created service.
- __Revision__: point-in-time and immutable snapshot of the code and configuration for each modification made to the workload.
- __Route__: maps a network endpoint to one or more revisions.
- __Configuration__: maintains the desired state for your deployment, and it provides a clean separation between code and configuration.

Regarding the components that compose the Knative architecture, the following picture shows them including their interaction workflow:

![Knative Serverless Architecture](./images/serving-architecture.png)

- __Activator__: It is responsible to queue incoming requests (if a Knative Service is scaled-to-zero) and acts as a request buffer to handle traffic bursts.
- __Autoscaler__: The autoscaler is responsible to scale the Knative Services based on configuration, metrics and incoming requests.
- __Controller__: It watches several objects, manages the lifecycle of dependent resources, and updates the resource state.
- __Queue-Proxy__: The Queue-Proxy is a sidecar container in the Knative Service's Pod. It is responsible to collect metrics and enforcing the desired concurrency when forwarding requests to the user's container. It can also act as a queue if necessary, similar to the Activator.
- __Webhooks__: Knative Serving has several webhooks responsible to validate and mutate Knative Resources.

Regarding HTTP and HTTPS request, it is important to understand how each request is handle by Knative:

![Knative Serverless Requests Flow](./images/request-flow.png)

Additionally, Openshift Serverless installs a set of components to implement the HTTP Router abstracting customers to this required solution. 

![Openshift Serverless Requests Flow](./images/request-flow-ocp.png)

NOTE: In order to be able to troubleshoot ingress connections, it is possible to configure access logs in the Openshift default router applying the configuration included in the file *files/router-access-log-enable.yaml*.

It is also keep in mind the following information about load balancing:

- Activator pods are scaled horizontally, so there may be multiple Activators in a deployment.

### Setup

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

### Application Tests

Once the hello world application is deployed, it is possible to define a set of different configurations in order to control the performance of the application modifying the total request received per replica among other things.

The idea in this section is playing with different configurations and observe the Application and Knative solution performance.

- 50 Virtual Users during 30 seconds (Solved by 1 microservice by default)

```$bash
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 50 --duration 30s testing/k8-load-test-simple.js
```

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
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 50 --duration 30s testing/k8-load-test-simple.js
```

- 25 Virtual Users during 30 seconds with a limit of 25 simultaneous requests and scale with 80%, it means as of 20 request per pod (Solved by 2 microservice)

```$bash
# Define request limits
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/target-utilization-percentage":"80"}}}}}' --type='merge'
oc patch ksvc hello-app -n hello-app  -p '{"spec":{"template":{"spec":{"containerConcurrency":25}}}}' --type='merge'

# launch the test
URL=$(oc get ksvc -o jsonpath='{.items[0].status.url}' -n hello-app)
TEST_URL=$URL K6_INSECURE_SKIP_TLS_VERIFY=true k6 run --vus 25 --duration 30s testing/k8-load-test-simple.js
```

NOTE: It is possible to configure Request per Seconds (RPS) policies, additional autoscaling providers, min and max replicas, scale to zero rules, scaling windows, and other strategies, please review autoscaling documentation

## Knative Eventing

WIP

## Links

- [Openshift Serverless Performance Tests](https://docs.openshift.com/serverless/1.29/install/preparing-serverless-install.html#about-serverless-scalability-performance)
- [Configuring Ingress access logging in Openshift Router](https://docs.openshift.com/container-platform/4.13/networking/ingress-operator.html#nw-configure-ingress-access-logging_configuring-ingress)
- [Openshift Serverless KnativeServing CRD](https://github.com/openshift-knative/serverless-operator/blob/main/olm-catalog/serverless-operator/manifests/operator_v1beta1_knativeserving_crd.yaml)
- [Openshift Serverless KnativeServing Autoscaling Configuration](https://docs.openshift.com/serverless/1.29/knative-serving/autoscaling/serverless-autoscaling-developer.html)

## Author

Asier Cidon @RedHat
