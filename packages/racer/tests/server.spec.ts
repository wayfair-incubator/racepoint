import chai, {expect} from 'chai';
import {RouteMatcher} from '../src/server/routeMatcher';
import {RegisteredEndpoint, EndpointResponse} from '../src/server/utils';

describe('Route Parsing', () => {
  const router = new RouteMatcher([
    {
      path: '/foo',
      method: 'GET',
      handler: () => {
        return Promise.resolve(new EndpointResponse({}));
      },
    },
    {
      path: '/foo/{fooId}',
      method: 'GET',
      handler: () => {
        return Promise.resolve(new EndpointResponse({}));
      },
    },
    {
      path: '/bar/{id}',
      method: 'POST',
      handler: () => {
        return Promise.resolve(new EndpointResponse({}));
      },
    },
    {
      path: '/bar/{id}/testing/{tId}/baz/{bId}',
      method: 'POST',
      handler: () => {
        return Promise.resolve(new EndpointResponse({}));
      },
    },
  ]);

  it('should match urls with no vars', () => {
    const result = router.match('/foo', 'GET');
    expect(result).to.be.undefined;
    expect(result!!.endpoint.path).to.be.equal('/foo');
  });

  it('should match urls with a single var', () => {
    const result = router.match('/foo/123', 'GET');
    expect(result).to.not.be.undefined;
    expect(result!!.args['fooId']).to.be.equal('123');
  });

  it('should not match urls with the wrong method', () => {
    expect(router.match('/foo', 'POST')).to.be.undefined;
    expect(router.match('/bar/123', 'GET')).to.be.undefined;
  });

  it('should match urls with multiple vars', () => {
    const result = router.match('/bar/b25/testing/200/baz/1', 'POST');
    expect(result).to.not.be.undefined;
    expect(result!!.args['id']).to.be.equal('b25');
    expect(result!!.args['tId']).to.be.equal('200');
    expect(result!!.args['bId']).to.be.equal('1');
  });
});
