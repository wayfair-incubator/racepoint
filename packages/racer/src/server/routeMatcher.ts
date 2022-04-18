import {RegisteredEndpoint} from './utils';
/*
    Used to allow one to create routes in their Endpoints like "/foo/bar/{barId}/baz/{bazId}" and receive those named arguments in
    their handler functions
*/

interface RouteMatchingContext {
  symbols: string[];
  routeReg: RegExp;
  endpoint: RegisteredEndpoint<any>;
}

interface MatchedEndpoint {
  endpoint: RegisteredEndpoint<any>;
  args: {[name: string]: string};
}

export class RouteMatcher {
  private static nameReg = /\{(\S+?)\}/g;
  private _routes: RouteMatchingContext[] = [];

  constructor(endpoints: RegisteredEndpoint<any>[]) {
    endpoints.forEach((endpoint) => this._routes.push(this.convert(endpoint)));
  }

  public match(targetUrl: string, method: string): undefined | MatchedEndpoint {
    const matchedContext = this._routes.find(
      (context) =>
        targetUrl.match(context.routeReg) !== null &&
        context.endpoint.method.toUpperCase() === method.toUpperCase()
    );
    let response: MatchedEndpoint | undefined = undefined;
    if (matchedContext) {
      const breakdown = targetUrl.match(matchedContext.routeReg);
      response = {
        endpoint: matchedContext.endpoint,
        args: {},
      };
      matchedContext.symbols.forEach((key, index) => {
        response!!.args[key] = breakdown!![index + 1];
      });
    }
    return response;
  }

  private extractSymbols = (target: string): string[] => {
    // first extract the names
    const matched: string[] = [];
    const results = target.match(RouteMatcher.nameReg);
    // for some reason I cannot figure out, the reg exp above matches the curly braces even though they're outside the match group
    // i.e. this same regexp in https://regex101.com/ works as expected without including the braces in the match group
    if (results) {
      results.forEach((r) => matched.push(r.replace('{', '').replace('}', '')));
    }
    return matched;
  };

  private convert(endpoint: RegisteredEndpoint<any>): RouteMatchingContext {
    const symbols = this.extractSymbols(endpoint.path);
    let replaced = endpoint.path;
    symbols.forEach(
      (symbol) => (replaced = replaced.replace(`{${symbol}}`, '([^\\/]*?)'))
    );
    return {
      symbols,
      endpoint,
      routeReg: new RegExp(replaced + '$'),
    };
  }
}
