import {Role, ServicePrincipal, CfnInstanceProfile} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";

export function createIAMRole(scope: Construct): Role {
    return new Role(scope, "InstanceRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
}

export function createInstanceProfile(
    scope: Construct,
    role: Role
): CfnInstanceProfile {
    return new CfnInstanceProfile(scope, "InstanceProfile", {
        roles: [role.roleName],
    });
}
