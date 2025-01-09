import { Role, ServicePrincipal, CfnInstanceProfile } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class IAM extends Construct {
    public readonly role: Role;
    public readonly instanceProfile: CfnInstanceProfile;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.role = new Role(scope, "InstanceRole", {
            assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
        });

        this.instanceProfile = new CfnInstanceProfile(scope, "InstanceProfile", {
            roles: [this.role.roleName],
        });
    }
}
