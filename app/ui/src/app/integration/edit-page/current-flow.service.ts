import { Injectable, EventEmitter } from '@angular/core';
import { Subscription, BehaviorSubject } from 'rxjs';

import {
  createStep,
  createConnectionStep,
  DataShape,
  Integration,
  Step,
  IntegrationSupportService,
  ActionDescriptor,
  Flow,
  Flows,
  StepOrConnection,
  Action,
} from '@syndesis/ui/platform';
import { log, getCategory } from '@syndesis/ui/logging';
import {
  IntegrationStore,
  DATA_MAPPER,
  StepStore,
  SPLIT,
  AGGREGATE,
} from '@syndesis/ui/store';
import {
  FlowEvent,
  FlowError,
  FlowErrorKind,
  getNextAggregateStep,
  INTEGRATION_UPDATED,
  INTEGRATION_INSERT_STEP,
  INTEGRATION_INSERT_DATAMAPPER,
  INTEGRATION_INSERT_CONNECTION,
  INTEGRATION_REMOVE_STEP,
  INTEGRATION_SET_STEP,
  INTEGRATION_SET_METADATA,
  INTEGRATION_SET_PROPERTIES,
  INTEGRATION_SET_ACTION,
  INTEGRATION_SET_DESCRIPTOR,
  INTEGRATION_SET_PROPERTY,
  INTEGRATION_SAVE,
  INTEGRATION_SET_DATASHAPE,
  INTEGRATION_SET_CONNECTION,
} from '@syndesis/ui/integration/edit-page';
import {
  setIntegrationProperty,
  createStepUsingStore,
  createStepWithConnection,
  setDataShapeOnStep,
  prepareIntegrationForSaving,
  setDescriptorOnStep,
  setActionOnStep,
  setConfiguredPropertiesOnStep,
  addMetadataToStep,
  getFlow,
  setFlow,
  createFlowWithId,
  insertStepIntoFlowAfter,
  insertStepIntoFlowBefore,
  setStepInFlow,
  getLastPosition,
  getFirstPosition,
  removeStepFromFlow,
  getMiddlePosition,
  getStep,
  isActionShapeless,
  filterStepsByPosition,
  getStartStep,
  getLastStep,
  getMiddleSteps,
  getSubsequentSteps,
  getSubsequentConnections,
  getSubsequentStepsWithDataShape,
  getPreviousSteps,
  getPreviousStepsWithDataShape,
  getPreviousConnections,
  getPreviousConnection,
  getSubsequentConnection,
  getPreviousStepIndexWithDataShape,
  getPreviousStepWithDataShape,
  getSubsequentStepWithDataShape,
  validateFlow,
} from './flow-functions';
import { ActivatedRoute, Router } from '@angular/router';

const category = getCategory('CurrentFlow');

function executeEventAction(func: any, ...args: any[]) {
  if (func && typeof func === 'function') {
    func.call(func, args);
  }
}

@Injectable()
export class CurrentFlowService {
  events = new EventEmitter<FlowEvent>();

  flows$ = new BehaviorSubject<Flow[]>(undefined);
  currentFlowErrors$ = new BehaviorSubject<FlowError[]>([]);
  currentFlow$ = new BehaviorSubject<Flow>(undefined);
  integration$ = new BehaviorSubject<Integration>(undefined);
  loaded$ = new BehaviorSubject<boolean>(false);

  public flowId?: string;

  private _integration: Integration;

  constructor(
    private integrationStore: IntegrationStore,
    private stepStore: StepStore,
    private integrationSupportService: IntegrationSupportService
  ) {
    this.events.subscribe((event: FlowEvent) => this.handleEvent(event));
  }

  cleanup(): void {
    this.flowId = undefined;
    this._integration = undefined;
  }

  isSaved(): boolean {
    /**
     * TODO: check if this is the proper way to check if the integration has been
     * saved or not
     */
    return !!this.integration.id;
  }

  isValid(): boolean {
    // TODO more validations on the integration
    return this.integration.name && this.integration.name.length > 0;
  }

  /**
   * Returns the connections suitable for the given position in the integration flow
   * @param steps
   * @param position
   */
  filterStepsByPosition(steps: StepOrConnection[], position: number) {
    return filterStepsByPosition(
      this._integration,
      this.flowId,
      steps,
      position
    );
  }

  /**
   * Returns the current flow name
   *
   * @returns {string}
   * @memberof CurrentFlow
   */
  getCurrentFlowName(): string {
    return this.currentFlow.name;
  }

  /**
   * Returns the current flow description
   *
   * @returns {string}
   * @memberof CurrentFlow
   */
  getCurrentFlowDescription(): string {
    return this.currentFlow.description;
  }

  /**
   * Returns the first step in the integration flow
   *
   * @returns {Step}
   * @memberof CurrentFlow
   */
  getStartStep(): Step {
    return getStartStep(this._integration, this.flowId);
  }

  /**
   * Returns the last step in the integration flow
   *
   * @returns {Step}
   * @memberof CurrentFlow
   */
  getEndStep(): Step {
    return getLastStep(this._integration, this.flowId);
  }

  /**
   * Returns all steps in between the first and last step in the integration
   *
   * @returns {Array<Step>}
   * @memberof CurrentFlow
   */
  getMiddleSteps(): Array<Step> {
    return getMiddleSteps(this._integration, this.flowId);
  }

  /**
   * Return all steps in the flow after the supplied position
   *
   * @param {any} position
   * @returns {Array<Step>}
   * @memberof CurrentFlow
   */
  getSubsequentSteps(position): Array<Step> {
    return getSubsequentSteps(this._integration, this.flowId, position);
  }

  /**
   * Return all steps in the flow after the supplied position that are connctions
   *
   * @param {any} position
   * @returns {Array<Step>}
   * @memberof CurrentFlow
   */
  getSubsequentConnections(position): Array<Step> {
    return getSubsequentConnections(this._integration, this.flowId, position);
  }

  /**
   * Return all DataShape aware steps after the supplied position.
   * @param {number} position
   * @returns {Array<{step: Step, index: number}>}
   */
  getSubsequentStepsWithDataShape(
    position
  ): Array<{ step: Step; index: number }> {
    return getSubsequentStepsWithDataShape(
      this._integration,
      this.flowId,
      position
    );
  }

  /**
   * Return all steps in the flow before the supplied position
   *
   * @param {any} position
   * @returns {Array<Step>}
   * @memberof CurrentFlow
   */
  getPreviousSteps(position): Array<Step> {
    return getPreviousSteps(this._integration, this.flowId, position);
  }

  /**
   * Return all DataShape aware steps before the supplied position.
   * @param {number} position
   * @returns {Array<{step: Step, index: number}>}
   */
  getPreviousStepsWithDataShape(
    position
  ): Array<{ step: Step; index: number }> {
    return getPreviousStepsWithDataShape(
      this._integration,
      this.flowId,
      position
    );
  }

  /**
   * Return all steps that are connections in the flow before the supplied position
   *
   * @param {any} position
   * @returns {Array<Step>}
   * @memberof CurrentFlow
   */
  getPreviousConnections(position): Array<Step> {
    return getPreviousConnections(this._integration, this.flowId, position);
  }

  /**
   * Return the first connection in the flow before the supplied position
   *
   * @param {any} position
   * @returns {Step}
   * @memberof CurrentFlow
   */
  getPreviousConnection(position): Step {
    return getPreviousConnection(this._integration, this.flowId, position);
  }

  /**
   * Return the first connection in the flow after the supplied position
   *
   * @param {any} position
   * @returns {Step}
   * @memberof CurrentFlow
   */
  getSubsequentConnection(position): Step {
    return getSubsequentConnection(this._integration, this.flowId, position);
  }

  getPreviousStepIndexWithDataShape(position): number {
    return getPreviousStepIndexWithDataShape(
      this._integration,
      this.flowId,
      position
    );
  }

  getPreviousStepWithDataShape(position): Step {
    return getPreviousStepWithDataShape(
      this._integration,
      this.flowId,
      position
    );
  }

  getSubsequentStepWithDataShape(position): Step {
    return getSubsequentStepWithDataShape(
      this._integration,
      this.flowId,
      position
    );
  }

  /**
   * Returns the initial index in the flow of steps in the integration
   *
   * @returns {number}
   * @memberof CurrentFlow
   */
  getFirstPosition(): number {
    return getFirstPosition(this._integration, this.flowId);
  }

  /**
   * Returns the ending index in the flow of steps in the integration
   *
   * @returns {number}
   * @memberof CurrentFlow
   */
  getLastPosition(): number {
    return getLastPosition(this._integration, this.flowId);
  }

  /**
   * Returns a position in the middle of the first and last step
   *
   * @returns {number}
   * @memberof CurrentFlow
   */
  getMiddlePosition(): number {
    return getMiddlePosition(this._integration, this.flowId);
  }

  /**
   * Returns the step at the given position
   *
   * @param {number} position
   * @returns {Step}
   * @memberof CurrentFlow
   */
  getStep(position: number): Step {
    return getStep(this.integration, this.flowId, position);
  }

  isEmpty(): boolean {
    if (!this.steps) {
      return true;
    }
    return this.steps.length === 0;
  }

  atEnd(position: number): boolean {
    if (!this.steps) {
      return true;
    }
    // position is assumed to be 0 indexed
    return position + 1 >= this.steps.length;
  }

  isActionShapeless(descriptor: ActionDescriptor) {
    return isActionShapeless(descriptor);
  }

  handleEvent(event: FlowEvent): void {
    switch (event.kind) {
      case INTEGRATION_UPDATED: {
        // Nothing to do
        break;
      }
      case INTEGRATION_INSERT_STEP: {
        const position = +event.position;
        this._integration = insertStepIntoFlowAfter(
          this._integration,
          this.flowId,
          createStepUsingStore(this.stepStore),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_INSERT_DATAMAPPER: {
        const position = +event.position;
        this._integration = insertStepIntoFlowBefore(
          this._integration,
          this.flowId,
          createStepUsingStore(this.stepStore, DATA_MAPPER),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_INSERT_CONNECTION: {
        const position = +event.position;
        this._integration = insertStepIntoFlowAfter(
          this._integration,
          this.flowId,
          createConnectionStep(),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_REMOVE_STEP: {
        {
          const position = +event.position;
          this._integration = removeStepFromFlow(
            this._integration,
            this.flowId,
            position
          );
          executeEventAction(event.onSave);
          this.postUpdates();
        }
        break;
      }
      case INTEGRATION_SET_STEP: {
        const position = +event.position;
        const step = event.step as Step;
        this.executeStepCustomizations(position, step, (_step: Step) => {
          this._integration = setStepInFlow(
            this._integration,
            this.flowId,
            { ..._step },
            position
          );
          executeEventAction(event.onSave);
          this.postUpdates();
        });
        break;
      }
      case INTEGRATION_SET_METADATA: {
        const position = +event.position;
        const metadata = event.metadata;
        const step =
          getStep(this._integration, this.flowId, position) || createStep();
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          addMetadataToStep(step, metadata),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_SET_PROPERTIES: {
        const position = +event.position;
        const properties = event.properties;
        const step =
          getStep(this._integration, this.flowId, position) || createStep();
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          setConfiguredPropertiesOnStep(step, properties),
          position
        );
        this.postUpdates();
        executeEventAction(event.onSave);
        break;
      }
      case INTEGRATION_SET_ACTION: {
        const position = +event.position;
        const action = event.action;
        const stepKind = event.stepKind;
        const step =
          getStep(this._integration, this.flowId, position) || createStep();
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          setActionOnStep(step, action, stepKind),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_SET_DESCRIPTOR: {
        const position = +event.position;
        const descriptor = event.descriptor;
        const step =
          getStep(this._integration, this.flowId, position) || createStep();
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          setDescriptorOnStep(step, descriptor),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_SET_DATASHAPE: {
        const position = +event.position;
        const dataShape = event.dataShape as DataShape;
        const isInput = event.isInput;
        const step =
          getStep(this._integration, this.flowId, position) || createStep();
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          setDataShapeOnStep(step, dataShape, isInput),
          position
        );
        executeEventAction(event['onSave']);
        this.postUpdates();
        break;
      }
      case INTEGRATION_SET_CONNECTION: {
        const position = +event.position;
        const connection = event.connection;
        this._integration = setStepInFlow(
          this._integration,
          this.flowId,
          createStepWithConnection(connection),
          position
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      }
      case INTEGRATION_SET_PROPERTY:
        this._integration = setIntegrationProperty(
          this._integration,
          event.property,
          event.value
        );
        executeEventAction(event.onSave);
        this.postUpdates();
        break;
      case INTEGRATION_SAVE: {
        // ensure that all steps have IDs before saving
        const integration = prepareIntegrationForSaving(
          this.getIntegrationClone()
        );
        const finishUp = (i: Integration, subscription: Subscription) => {
          executeEventAction(event.action, i);
          sub.unsubscribe();
        };

        const sub = this.integrationStore.updateOrCreate(integration).subscribe(
          (i: Integration) => {
            if (!this._integration.id) {
              this._integration.id = i.id;
            }
            if (event.publish) {
              this.integrationSupportService
                .deploy(i)
                .toPromise()
                .then(() => {
                  finishUp(i, sub);
                });
            } else {
              finishUp(i, sub);
            }
          },
          (reason: any) => {
            log.info(
              () =>
                'Error saving integration: ' +
                JSON.stringify(reason, undefined, 2),
              category
            );
            executeEventAction(event.error, reason);
            sub.unsubscribe();
          }
        );
        break;
      }
      default:
        break;
    }
  }

  executeStepCustomizations(
    position: number,
    step: Step,
    then: (step: Step) => void
  ): any {
    switch (step.stepKind) {
      case SPLIT:
      case AGGREGATE:
        // A split step needs the data shape of the previous thing with a data shape
        const prev = this.getPreviousStepWithDataShape(position);
        const subsequent = this.getSubsequentStepWithDataShape(position);
        const subsequentDataShape = subsequent !== undefined ? subsequent.action.descriptor.inputDataShape : undefined;
        this.integrationSupportService
          .getStepDescriptor(step.stepKind, {
            inputShape: step.stepKind === AGGREGATE ? subsequentDataShape : prev.action.descriptor.inputDataShape,
            outputShape: prev.action.descriptor.outputDataShape,
          })
          .subscribe(
            descriptor => {
              step = {
                ...step,
                action: { actionType: 'step', descriptor } as Action,
              };
              then(step);
            },
            err => {
              // we'll just pass through
              then(step);
            }
          );
        break;
      default:
        setTimeout(() => then(step), 1);
    }
  }

  isApiProvider() {
    try {
      return this.getStartStep().connection.connectorId === 'api-provider';
    } catch (e) {
      // ignore
    }
    return false;
  }

  /**
   * Examine the state of the current flow and make the user fill in the blanks as needed
   * @param route
   * @param router
   */
  validateFlowAndMaybeRedirect(route: ActivatedRoute, router: Router) {
    if (!this.loaded || !this.flowId) {
      return false;
    }
    const validations = this.validate();
    for (const validation of validations) {
      switch (validation.kind) {
        case FlowErrorKind.NO_START_CONNECTION:
          router.navigate(['step-select', this.getFirstPosition()], {
            relativeTo: route.parent,
          });
          return false;
        case FlowErrorKind.NO_FINISH_CONNECTION:
          router.navigate(['step-select', this.getLastPosition()], {
            relativeTo: route.parent,
          });
          return false;
        default:
        // this function doesn't need to deal with it
      }
    }
    return true;
  }

  /**
   * Finds the closest step of type 'Aggregate' after the provided position.
   * @param position
   */
  getNextAggregateStep(position: number): Step | undefined {
    return getNextAggregateStep(this.integration, this.flowId, position);
  }

  validate() {
    return validateFlow(this._integration, this.flowId);
  }

  getIntegrationClone(): Integration {
    return JSON.parse(JSON.stringify(this.integration));
  }

  get loaded(): boolean {
    return (
      typeof this._integration !== 'undefined' &&
      typeof this._integration.flows !== 'undefined'
    );
  }

  get flows(): Flows {
    return this.integration.flows;
  }

  get integration(): Integration {
    if (!this._integration) {
      return undefined;
    }
    return this._integration;
  }

  get steps(): Array<Step> {
    if (!this._integration || !this.flowId) {
      return undefined;
    }
    return this.currentFlow.steps;
  }

  set integration(i: Integration) {
    this._integration = <Integration>i;
    if (!this.flowId) {
      this.flowId = i.flows && i.flows.length > 0 ? i.flows[0].id : undefined;
    }
    this.postUpdates();
    setTimeout(() => {
      this.events.emit({
        kind: INTEGRATION_UPDATED,
        integration: this.integration,
      });
    }, 10);
  }

  get currentFlow() {
    return this.flow(this.flowId);
  }

  private flow(id: string): Flow {
    if (!id) {
      return undefined;
    }
    let flow = getFlow(this._integration, id);
    if (flow === undefined) {
      flow = createFlowWithId(id);
      this._integration = setFlow(this._integration, flow);
    }
    return flow;
  }

  private postUpdates() {
    this.integration$.next(this.integration);
    this.flows$.next(this.flows);
    this.currentFlow$.next(this.currentFlow);
    try {
      // TODO this can throw an exception the integration isn't set up right, but there's a specific test for that, so for now...
      this.currentFlowErrors$.next(this.validate());
    } catch (err) {
      // TODO nothing
    }
    this.loaded$.next(this.loaded);
  }
}
