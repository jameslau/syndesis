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
package io.syndesis.connector.fhir;

import io.syndesis.common.model.integration.Step;
import org.assertj.core.api.Assertions;
import org.hl7.fhir.dstu3.model.Patient;
import org.junit.Test;

import java.util.Arrays;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okXml;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;

public class FhirReadTest extends FhirTestBase {

    @Override
    protected List<Step> createSteps() {
        return Arrays.asList(newSimpleEndpointStep(
            "direct",
            builder -> builder.putConfiguredProperty("name", "start")),
            newFhirEndpointStep("io.syndesis:fhir-read-connector", builder -> {
                builder.putConfiguredProperty("resourceType", "Patient");
                builder.putConfiguredProperty("id", "1234");
            }));
    }

    @Test
    public void readWithIdProvidedAsParameterTest() {
        stubFhirRequest(get(urlEqualTo("/Patient/1234")).willReturn(okXml(toXml(new Patient().setId("1234")))));

        String patient = template.requestBody("direct:start", "", String.class);

        Assertions.assertThat(patient).contains("<id value=\"1234\"></id>");
    }

    @Test
    public void readWithIdProvidedInBodyTest() {
        stubFhirRequest(get(urlEqualTo("/Patient/4321")).willReturn(okXml(toXml(new Patient().setId("4321")))));

        FhirResourceId id = new FhirResourceId();
        id.setId("4321");

        String patient = template.requestBody("direct:start", id, String.class);

        Assertions.assertThat(patient).contains("<id value=\"4321\"></id>");
    }


}
