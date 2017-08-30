import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { Connection } from '../../model';
import { ConnectionService } from '../../store/connection/connection.service';
import { ConnectionDetailConfigurationService } from './configuration.service';

@Component({
  selector: 'syndesis-connection-detail-info',
  template: `
    <h1>
      <dl class="dl-horizontal">
        <dt>
          <img src="../../../assets/icons/{{ connection.connectorId }}.connection.png" height="46" width="46">
        </dt>
        <dd>
          <syndesis-editable-text [value]="connection.name"
                                  [validationFn]="validateName"
                                  (onSave)="onAttributeUpdated('name', $event)"></syndesis-editable-text>
        </dd>
      </dl>
    </h1>
    <div>
      <syndesis-editable-tags [value]="connection.tags"
                              placeholder="No tags set..."
                              (onSave)="onAttributeUpdated('tags', $event)"></syndesis-editable-tags>
    </div>
    <p class="description">
      <syndesis-editable-textarea [value]="connection.description"
                                  placeholder="No description set..."
                                  (onSave)="onAttributeUpdated('description', $event)"></syndesis-editable-textarea>
    </p>
  `,
  styles: [`
    h1 dt { width: 46px; }
    h1 dd { margin-left: 66px; }
    .description { margin-top: 10px; }
  `],
})
export class ConnectionDetailInfoComponent {

  @Input() connection: Connection;
  @Output() updated = new EventEmitter<Connection>();

  constructor(
    private connectionService: ConnectionService,
    private configurationService: ConnectionDetailConfigurationService,
  ) {}

  onAttributeUpdated(attr: string, value) {
    this.connection[attr] = value;
    this.updated.emit(this.connection);
  }

  validateName = (name: string) => {
    if (name === '') {
      return 'Name is required';
    } else {
      const connection = this.configurationService.cloneObject(this.connection);
      connection.name = name;
      return this.connectionService.validate(connection)
        .toPromise()
        .then(response => null)
        .catch(response => {
          const nameTaken = response.data.filter(item => item.error === 'UniqueProperty').length > 0;
          return nameTaken ? 'That name is taken. Try another.' : null;
        });
    }
  }

}
