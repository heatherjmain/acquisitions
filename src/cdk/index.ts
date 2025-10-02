import { App } from "aws-cdk-lib";
import { AcquisitionsStack } from "./stack";

const app = new App();
new AcquisitionsStack(app, "dev-acquisitions-stack");

app.synth();
