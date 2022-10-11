import { RawTopologyMetrics, TopologyMetricPeer } from '../../api/loki';
import { NodeData } from '../../model/topology';
import { calibrateRange, computeStats, matchPeer, normalizeMetrics, parseMetrics } from '../metrics';

describe('normalize and computeStats', () => {
  it('should normalize and compute simple stats', () => {
    const values: [number, unknown][] = [
      [1664372000, '5'],
      [1664372015, '5'],
      [1664372030, '5'],
      [1664372045, '5'],
      [1664372060, '5'],
      [1664372075, '5'],
      [1664372090, '5'],
      [1664372105, '10'],
      [1664372120, '10'],
      [1664372135, '10'],
      [1664372150, '10'],
      [1664372165, '10'],
      [1664372180, '10'],
      [1664372195, '10'],
      [1664372210, '8'],
      [1664372225, '8'],
      [1664372240, '8'],
      [1664372255, '8'],
      [1664372270, '8'],
      [1664372285, '8'],
      [1664372300, '8']
    ];

    const { start, end, step } = calibrateRange([values], { from: 1664372000, to: 1664372300 });
    const norm = normalizeMetrics(values, start, end, step);
    expect(norm).toEqual([
      [1664372000, 5],
      [1664372015, 5],
      [1664372030, 5],
      [1664372045, 5],
      [1664372060, 5],
      [1664372075, 5],
      [1664372090, 5],
      [1664372105, 10],
      [1664372120, 10],
      [1664372135, 10],
      [1664372150, 10],
      [1664372165, 10],
      [1664372180, 10],
      [1664372195, 10],
      [1664372210, 8],
      [1664372225, 8],
      [1664372240, 8],
      [1664372255, 8],
      [1664372270, 8],
      [1664372285, 8],
      [1664372300, 8]
    ]);

    const stats = computeStats(norm);

    expect(stats.latest).toEqual(8);
    expect(stats.max).toEqual(10);
    expect(stats.avg).toEqual(7.67 /* 161/21 */);
    expect(stats.total).toEqual(2300 /* 7.67*300 */);
  });

  it('should normalize and compute stats with missing close to "now"', () => {
    // Building data so that there is a missing datapoint at +300s, which is close to "now"
    // This missing datapoint should be ignored for tolerance, rather than counted as a zero
    const now = Math.floor(new Date().getTime() / 1000);
    const first = now - 330;
    const values: [number, unknown][] = [
      [first, '5'],
      [first + 15, '5'],
      [first + 30, '5'],
      [first + 45, '5'],
      [first + 60, '5'],
      [first + 75, '5'],
      [first + 90, '5'],
      [first + 105, '10'],
      [first + 120, '10'],
      [first + 135, '10'],
      [first + 150, '10'],
      [first + 165, '10'],
      [first + 180, '10'],
      [first + 195, '10'],
      [first + 210, '8'],
      [first + 225, '8'],
      [first + 240, '8'],
      [first + 255, '8'],
      [first + 270, '8'],
      [first + 285, '8']
    ];

    const { start, end, step } = calibrateRange([values], 300);
    const norm = normalizeMetrics(values, start, end, step);
    expect(norm).toEqual([
      [first, 5],
      [first + 15, 5],
      [first + 30, 5],
      [first + 45, 5],
      [first + 60, 5],
      [first + 75, 5],
      [first + 90, 5],
      [first + 105, 10],
      [first + 120, 10],
      [first + 135, 10],
      [first + 150, 10],
      [first + 165, 10],
      [first + 180, 10],
      [first + 195, 10],
      [first + 210, 8],
      [first + 225, 8],
      [first + 240, 8],
      [first + 255, 8],
      [first + 270, 8],
      [first + 285, 8]
    ]);

    const stats = computeStats(norm);

    expect(stats.latest).toEqual(8);
    expect(stats.max).toEqual(10);
    expect(stats.avg).toEqual(7.65 /* 153/20 */);
    expect(stats.total).toEqual(2180 /* 7.65*285 */);
  });

  it('should normalize and compute stats with missing data points', () => {
    // No data between 1664372105 and 1664372195
    const values: [number, unknown][] = [
      [1664372000, '5'],
      [1664372015, '5'],
      [1664372030, '5'],
      [1664372045, '5'],
      [1664372060, '5'],
      [1664372075, '5'],
      [1664372090, '5'],
      [1664372210, '8'],
      [1664372225, '8'],
      [1664372240, '8'],
      [1664372255, '8'],
      [1664372270, '8'],
      [1664372285, '8'],
      [1664372300, '8']
    ];

    const { start, end, step } = calibrateRange([values], { from: 1664372000, to: 1664372300 });
    const norm = normalizeMetrics(values, start, end, step);
    expect(norm).toEqual([
      [1664372000, 5],
      [1664372015, 5],
      [1664372030, 5],
      [1664372045, 5],
      [1664372060, 5],
      [1664372075, 5],
      [1664372090, 5],
      [1664372105, 0],
      [1664372120, 0],
      [1664372135, 0],
      [1664372150, 0],
      [1664372165, 0],
      [1664372180, 0],
      [1664372195, 0],
      [1664372210, 8],
      [1664372225, 8],
      [1664372240, 8],
      [1664372255, 8],
      [1664372270, 8],
      [1664372285, 8],
      [1664372300, 8]
    ]);

    const stats = computeStats(norm);

    expect(stats.latest).toEqual(8);
    expect(stats.max).toEqual(8);
    expect(stats.avg).toEqual(4.33 /* 91/21 */);
    expect(stats.total).toEqual(1300 /* 4.33*300 */);
  });
});

describe('matchPeers', () => {
  it('should match namespace nodes', () => {
    const peers: TopologyMetricPeer[] = [
      {
        namespace: ''
      },
      {
        namespace: 'test',
        displayName: 'test'
      }
    ];

    // With unknown
    const data: NodeData = {
      nodeType: 'unknown'
    };

    let matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[0]]);

    // With test namespace
    data.nodeType = 'namespace';
    data.resourceKind = 'Namespace';
    data.name = 'test';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[1]]);

    // With another namespace
    data.nodeType = 'namespace';
    data.resourceKind = 'Namespace';
    data.name = 'test2';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([]);
  });

  it('should match owner nodes', () => {
    const peers: TopologyMetricPeer[] = [
      {
        namespace: ''
      },
      {
        namespace: 'ns1',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        displayName: 'depl-a (depl)'
      },
      {
        namespace: 'ns1',
        ownerName: 'depl-b',
        ownerType: 'Deployment',
        displayName: 'depl-b'
      },
      {
        namespace: 'ns1',
        ownerName: 'depl-a',
        ownerType: 'DaemonSet',
        displayName: 'depl-a (ds)'
      },
      {
        namespace: 'ns2',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        displayName: 'depl-a (depl)'
      }
    ];

    // With unknown
    const data: NodeData = {
      nodeType: 'unknown'
    };

    let matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[0]]);

    // With depl-a deployment
    data.nodeType = 'owner';
    data.resourceKind = 'Deployment';
    data.name = 'depl-a';
    data.namespace = 'ns1';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[1]]);
  });

  it('should match resource nodes', () => {
    const peers: TopologyMetricPeer[] = [
      {
        namespace: ''
      },
      {
        namespace: 'ns1',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-a-12345',
        addr: '1.2.3.4',
        displayName: 'depl-a-12345'
      },
      {
        namespace: 'ns1',
        ownerName: 'depl-b',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-b-67890',
        addr: '1.2.3.5',
        displayName: 'depl-b-67890'
      },
      {
        namespace: 'ns1',
        type: 'Service',
        name: 'svc-a',
        addr: '1.2.3.6',
        displayName: 'svc-a'
      },
      {
        namespace: 'ns2',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-a-12345',
        addr: '1.2.3.7',
        displayName: 'depl-a-12345'
      }
    ];

    // With unknown
    const data: NodeData = {
      nodeType: 'unknown'
    };

    let matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[0]]);

    // With depl-a deployment
    data.nodeType = 'resource';
    data.resourceKind = 'Pod';
    data.name = 'depl-a';
    data.namespace = 'ns1';
    data.addr = '1.2.3.4';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[1]]);
  });

  it('should match group', () => {
    const peers: TopologyMetricPeer[] = [
      {
        namespace: ''
      },
      {
        namespace: 'ns1',
        hostName: 'host1',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-a-12345',
        addr: '1.2.3.4',
        displayName: 'depl-a-12345'
      },
      {
        namespace: 'ns1',
        hostName: 'host2',
        ownerName: 'depl-b',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-b-67890',
        addr: '1.2.3.5',
        displayName: 'depl-b-67890'
      },
      {
        namespace: 'ns1',
        type: 'Service',
        name: 'svc-a',
        addr: '1.2.3.6',
        displayName: 'svc-a'
      },
      {
        namespace: 'ns2',
        hostName: 'host1',
        ownerName: 'depl-a',
        ownerType: 'Deployment',
        type: 'Pod',
        name: 'depl-a-12345',
        addr: '1.2.3.7',
        displayName: 'depl-a-12345'
      }
    ];

    // With namespace group
    const data: NodeData = {
      nodeType: 'namespace',
      resourceKind: 'Namespace',
      name: 'ns1'
    };

    let matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[1], peers[2], peers[3]]);

    // With node group
    data.nodeType = 'host';
    data.resourceKind = 'Node';
    data.name = 'host1';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[1], peers[4]]);

    // With node+namespace
    data.parentKind = 'Namespace';
    data.parentName = 'ns2';

    matches = peers.filter(p => matchPeer(data, p));
    expect(matches).toEqual([peers[4]]);
  });
});

describe('parseMetrics', () => {
  it('should disambiguate same names', () => {
    const metrics: RawTopologyMetrics[] = [
      {
        metric: {
          SrcK8S_Name: 'A',
          SrcK8S_Namespace: 'ns1',
          SrcK8S_Type: 'Pod',
          DstK8S_Name: 'B',
          DstK8S_Namespace: 'ns1',
          DstK8S_Type: 'Pod'
        },
        values: []
      },
      {
        metric: {
          SrcK8S_Name: 'A',
          SrcK8S_Namespace: 'ns1',
          SrcK8S_Type: 'Pod',
          DstK8S_Name: 'B',
          DstK8S_Namespace: 'ns1',
          DstK8S_Type: 'Service'
        },
        values: []
      }
    ];

    const parsed = parseMetrics(metrics, 300, 'resource');

    expect(parsed).toHaveLength(2);
    expect(parsed[0].source.displayName).toEqual('ns1.A');
    expect(parsed[0].destination.displayName).toEqual('ns1.B (pod)');
    expect(parsed[1].source.displayName).toEqual('ns1.A');
    expect(parsed[1].destination.displayName).toEqual('ns1.B (svc)');
  });
});