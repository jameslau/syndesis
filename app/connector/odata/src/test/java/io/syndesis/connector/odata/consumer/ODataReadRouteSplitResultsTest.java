/*
 * Copyright (C) 2016 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.syndesis.connector.odata.consumer;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import java.util.List;
import java.util.Map;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.component.mock.MockEndpoint;
import org.apache.camel.component.olingo4.Olingo4Endpoint;
import org.apache.camel.spring.SpringCamelContext;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.support.DirtiesContextTestExecutionListener;
import io.syndesis.common.model.connection.ConfigurationProperty;
import io.syndesis.common.model.connection.Connection;
import io.syndesis.common.model.connection.Connector;
import io.syndesis.common.model.integration.Integration;
import io.syndesis.common.model.integration.Step;
import io.syndesis.common.model.integration.StepKind;
import io.syndesis.connector.odata.PropertyBuilder;
import io.syndesis.connector.odata.server.ODataTestServer;

@DirtiesContext
@RunWith(SpringRunner.class)
@SpringBootTest(
    classes = {
        ODataReadRouteSplitResultsTest.TestConfiguration.class
    },
    properties = {
        "spring.main.banner-mode = off",
        "logging.level.io.syndesis.integration.runtime = DEBUG"
    }
)
@TestExecutionListeners(
    listeners = {
        DependencyInjectionTestExecutionListener.class,
        DirtiesContextTestExecutionListener.class
    }
)
public class ODataReadRouteSplitResultsTest extends AbstractODataReadRouteTest {

    //
    // Set the split results to true
    //
    public ODataReadRouteSplitResultsTest() throws Exception {
        super(true);
    }

    @Test
    public void testSimpleODataRoute() throws Exception {
        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                                .property(SERVICE_URI, defaultTestServer.serviceUrl()));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);

        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(defaultTestServer.getResultCount());

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
        testListResult(result, 1, TEST_SERVER_DATA_2);
        testListResult(result, 2, TEST_SERVER_DATA_3);
    }

    @Test
    public void testAuthenticatedODataRoute() throws Exception {
        Connector odataConnector = createODataConnector(
                                                    new PropertyBuilder<String>()
                                                        .property(SERVICE_URI, authTestServer.serviceUrl())
                                                        .property(BASIC_USER_NAME, ODataTestServer.USER),
                                                    new PropertyBuilder<ConfigurationProperty>()
                                                        .property(BASIC_PASSWORD, basicPasswordProperty())
                                                    );

        Step odataStep = createODataStep(odataConnector, authTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(authTestServer.getResultCount());

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
        testListResult(result, 1, TEST_SERVER_DATA_2);
        testListResult(result, 2, TEST_SERVER_DATA_3);
    }

    @Test
    public void testSSLODataRoute() throws Exception {
        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, sslTestServer.serviceUrl())
                                                            .property(CLIENT_CERTIFICATE, ODataTestServer.serverCertificate()));

        Step odataStep = createODataStep(odataConnector, sslTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(sslTestServer.getResultCount());

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
        testListResult(result, 1, TEST_SERVER_DATA_2);
        testListResult(result, 2, TEST_SERVER_DATA_3);
    }

    @Test
    public void testSSLAuthenticatedODataRoute() throws Exception {

        Connector odataConnector = createODataConnector(
                                                        new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, sslAuthTestServer.serviceUrl())
                                                            .property(CLIENT_CERTIFICATE, ODataTestServer.serverCertificate())
                                                            .property(BASIC_USER_NAME, ODataTestServer.USER),
                                                        new PropertyBuilder<ConfigurationProperty>()
                                                            .property(BASIC_PASSWORD, basicPasswordProperty())
                                                        );

        Step odataStep = createODataStep(odataConnector, sslAuthTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);

        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(sslAuthTestServer.getResultCount());

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
        testListResult(result, 1, TEST_SERVER_DATA_2);
        testListResult(result, 2, TEST_SERVER_DATA_3);
    }

    @Test
    @Ignore("Run manually as not strictly required")
    public void testReferenceODataRoute() throws Exception {
        String serviceUri = "https://services.odata.org/TripPinRESTierService";
        String methodName = "People";
        String queryParam = "$count=true";

        context = new SpringCamelContext(applicationContext);

        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, serviceUri)
                                                            .property(QUERY_PARAMS, queryParam)
                                                            .property(CLIENT_CERTIFICATE, ODataTestServer.referenceServiceCertificate()));

        Step odataStep = new Step.Builder()
            .stepKind(StepKind.endpoint)
            .action(readAction)
            .connection(
                            new Connection.Builder()
                                .connector(odataConnector)
                                .build())
            .putConfiguredProperty(METHOD_NAME, methodName)
            .build();
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(1);

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, REF_SERVER_PEOPLE_DATA_1);
    }

    @Test
    public void testODataRouteWithSimpleQuery() throws Exception {
        String queryParams = "$filter=ID eq 1";

        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(QUERY_PARAMS, queryParams));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(1);

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
    }

    @SuppressWarnings( "unchecked" )
    @Test
    public void testODataRouteWithCountQuery() throws Exception {
        String queryParams = "$count=true";
        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(QUERY_PARAMS, queryParams));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(1);

        context.start();

        result.assertIsSatisfied();
        List<String> json = extractJsonFromExchgMsg(result, 0, List.class);
        assertEquals(1, json.size());
        String expected = testData(TEST_SERVER_DATA_1_WITH_COUNT);
        JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
    }

    @SuppressWarnings( "unchecked" )
    @Test
    public void testODataRouteWithMoreComplexQuery() throws Exception {
        String queryParams = "$filter=ID le 2&$orderby=ID desc";

        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(QUERY_PARAMS, queryParams));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(2);

        context.start();

        result.assertIsSatisfied();
        List<String> json = extractJsonFromExchgMsg(result, 0, List.class);
        assertEquals(1, json.size());
        String expected = testData(TEST_SERVER_DATA_2);
        JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);

        json = extractJsonFromExchgMsg(result, 1, List.class);
        assertEquals(1, json.size());
        expected = testData(TEST_SERVER_DATA_1);
        JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
    }

    @Test
    public void testODataRouteWithKeyPredicate() throws Exception {
        String keyPredicate = "1";
        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(KEY_PREDICATE, keyPredicate));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(1);

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
    }

    @Test
    public void testODataRouteWithKeyPredicateWithBrackets() throws Exception {
        String keyPredicate = "(1)";
        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(KEY_PREDICATE, keyPredicate));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(1);

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
    }

    @Test
    public void testODataRouteWithConsumerDelayProperties() throws Exception {
        String initialDelayValue = "500";
        String delayValue = "1000";

        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(INITIAL_DELAY, initialDelayValue)
                                                            .property(DELAY, delayValue));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(defaultTestServer.getResultCount());

        context.start();

        result.assertIsSatisfied();
        testListResult(result, 0, TEST_SERVER_DATA_1);
        testListResult(result, 1, TEST_SERVER_DATA_2);
        testListResult(result, 2, TEST_SERVER_DATA_3);

        Olingo4Endpoint olingo4Endpoint = context.getEndpoint(OLINGO4_READ_ENDPOINT, Olingo4Endpoint.class);
        assertNotNull(olingo4Endpoint);
        Map<String, Object> consumerProperties = olingo4Endpoint.getConsumerProperties();
        assertNotNull(consumerProperties);
        assertTrue(consumerProperties.size() > 0);
        assertEquals(delayValue, consumerProperties.get(DELAY));
        assertEquals(initialDelayValue, consumerProperties.get(INITIAL_DELAY));
    }

    @SuppressWarnings( "unchecked" )
    @Test
    public void testODataRouteAlreadySeen() throws Exception {
        String backoffIdleThreshold = "1";
        String backoffMultiplier = "1";

        Connector odataConnector = createODataConnector(new PropertyBuilder<String>()
                                                            .property(SERVICE_URI, defaultTestServer.serviceUrl())
                                                            .property(FILTER_ALREADY_SEEN, Boolean.TRUE.toString())
                                                            .property(BACKOFF_IDLE_THRESHOLD, backoffIdleThreshold)
                                                            .property(BACKOFF_MULTIPLIER, backoffMultiplier));

        Step odataStep = createODataStep(odataConnector, defaultTestServer.methodName());
        Integration odataIntegration = createIntegration(odataStep, mockStep);

        RouteBuilder routes = newIntegrationRouteBuilder(odataIntegration);
        context.addRoutes(routes);

        int expectedMsgCount = defaultTestServer.getResultCount();
        MockEndpoint result = initMockEndpoint();
        result.setMinimumExpectedMessageCount(expectedMsgCount);

        context.start();

        result.assertIsSatisfied();

        for (int i = 0; i < expectedMsgCount; ++i) {
            List<String> json = extractJsonFromExchgMsg(result, i, List.class);
            assertEquals(1, json.size());

            String expected;
            switch (i) {
                case 0:
                    expected = testData(TEST_SERVER_DATA_1);
                    JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
                    break;
                case 1:
                    expected = testData(TEST_SERVER_DATA_2);
                    JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
                    break;
                case 2:
                    expected = testData(TEST_SERVER_DATA_3);
                    JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
                    break;
                default:
                    //
                    // Subsequent polling messages should be empty
                    //
                    expected = testData(TEST_SERVER_DATA_EMPTY);
                    JSONAssert.assertEquals(expected, json.get(0), JSONCompareMode.LENIENT);
            }
        }

        //
        // Check backup consumer options carried through to olingo4 component
        //
        Olingo4Endpoint olingo4Endpoint = context.getEndpoint(OLINGO4_READ_ENDPOINT, Olingo4Endpoint.class);
        assertNotNull(olingo4Endpoint);
        Map<String, Object> consumerProperties = olingo4Endpoint.getConsumerProperties();
        assertNotNull(consumerProperties);
        assertTrue(consumerProperties.size() > 0);
        assertEquals(backoffIdleThreshold, consumerProperties.get(BACKOFF_IDLE_THRESHOLD));
        assertEquals(backoffMultiplier, consumerProperties.get(BACKOFF_MULTIPLIER));
    }
}
