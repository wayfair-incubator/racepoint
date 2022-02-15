export interface ScenarioContext {}

/**
 * A Scenario defines a mode in which RacePoint can run. It defines the underlying behavior that should be executed,
 * scopes the various switches that can be used in the mode, and provides help descriptive help text for that Scenario
 */
export abstract class Scenario<SC extends ScenarioContext> {
  /**
   * What must the user type to activate this scenario?
   */
  abstract getCommand(): string;

  /**
   * The 'main' method that each scenario must execute
   *
   * @param userArgs
   */
  abstract runScenario(userArgs: any): void;

  /**
   *
   * @param userArgs
   */
  abstract buildContext(userArgs: any): SC;

  /**
   * The main entry point that all scenarios need to go through
   *
   * @param userArgs
   */
  enter(userArgs: any): void {
    this.runScenario(this.buildContext(userArgs));
  }
}
