package action

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"github.com/syndesisio/syndesis/install/operator/pkg/apis/syndesis/v1alpha1"
	"github.com/syndesisio/syndesis/install/operator/pkg/syndesis/configuration"
)

// Checks if the syndesis installation should be upgraded and move to the "Upgrading" status.
type checkUpdates struct {
	action
	operatorVersion string
}

var (
	CheckUpdatesAction = checkUpdates{action{actionLog.WithValues("type", "check-updates")}, ""}
)

func (a *checkUpdates) CanExecute(syndesis *v1alpha1.Syndesis) bool {
	return syndesisPhaseIs(syndesis,
		v1alpha1.SyndesisPhaseInstalled,
		v1alpha1.SyndesisPhaseStartupFailed)
}

func (a *checkUpdates) Execute(scheme *runtime.Scheme, cl Client, syndesis *v1alpha1.Syndesis) error {
	if a.operatorVersion == "" {
		operatorVersion, err := configuration.GetSyndesisVersionFromOperatorTemplate(scheme)
		if err != nil {
			return err
		}
		a.operatorVersion = operatorVersion
	}

	namespaceVersion, err := configuration.GetSyndesisVersionFromNamespace(cl, syndesis.Namespace)
	if err != nil {
		return err
	}

	if namespaceVersion == a.operatorVersion {
		// Everything fine
		return nil
	} else {
		// Let's start the upgrade process
		target := syndesis.DeepCopy()
		target.Status.Phase = v1alpha1.SyndesisPhaseUpgrading
		target.Status.TargetVersion = a.operatorVersion
		target.Status.Reason = v1alpha1.SyndesisStatusReasonMissing
		target.Status.Description = "Upgrading from " + namespaceVersion + " to " + a.operatorVersion
		target.Status.LastUpgradeFailure = nil
		target.Status.UpgradeAttempts = 0
		target.Status.ForceUpgrade = false

		a.log.Info("Starting upgrade of Syndesis resource", "name", syndesis.Name, "currentVersion", namespaceVersion, "targetVersion", a.operatorVersion, "type", "checkUpdate")
		return cl.Status().Update(context.TODO(), target)
	}
}
