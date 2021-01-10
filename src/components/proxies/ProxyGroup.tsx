import * as React from 'react';
import { Zap } from 'react-feather';
import { switchProxy, useProxyQuery } from 'src/store/proxies';

import {
  getCollapsibleIsOpen,
  getHideUnavailableProxies,
  getProxySortBy,
} from '../../store/app';
import Button from '../Button';
import CollapsibleSectionHeader from '../CollapsibleSectionHeader';
import { connect, useStoreActions } from '../StateProvider';
import { useFilteredAndSorted } from './hooks';
import s0 from './ProxyGroup.module.css';
import { ProxyList, ProxyListSummaryView } from './ProxyList';

const { createElement, useCallback, useMemo, useState } = React;

function ZapWrapper() {
  return (
    <div className={s0.zapWrapper}>
      <Zap size={16} />
    </div>
  );
}

function ProxyGroupImpl({
  name,
  delay,
  hideUnavailableProxies,
  proxySortBy,
  isOpen,
  apiConfig,
  dispatch,
}) {
  const {
    data: { proxies },
  } = useProxyQuery(apiConfig);
  const group = proxies[name];
  const { all: allItems, type, now } = group;
  const all = useFilteredAndSorted(
    allItems,
    delay,
    hideUnavailableProxies,
    proxySortBy,
    proxies
  );

  const isSelectable = useMemo(() => type === 'Selector', [type]);

  const {
    app: { updateCollapsibleIsOpen },
    proxies: { requestDelayForProxies },
  } = useStoreActions();

  const toggle = useCallback(() => {
    updateCollapsibleIsOpen('proxyGroup', name, !isOpen);
  }, [isOpen, updateCollapsibleIsOpen, name]);

  const itemOnTapCallback = useCallback(
    (proxyName) => {
      if (!isSelectable) return;
      dispatch(switchProxy(apiConfig, name, proxyName));
    },
    [apiConfig, dispatch, name, isSelectable]
  );

  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const testLatency = useCallback(async () => {
    setIsTestingLatency(true);
    try {
      await requestDelayForProxies(apiConfig, all);
    } catch (err) {}
    setIsTestingLatency(false);
  }, [all, apiConfig, requestDelayForProxies]);

  return (
    <div className={s0.group}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <CollapsibleSectionHeader
          name={name}
          type={type}
          toggle={toggle}
          qty={all.length}
          isOpen={isOpen}
        />
        <Button
          title="Test latency"
          kind="minimal"
          onClick={testLatency}
          isLoading={isTestingLatency}
        >
          <ZapWrapper />
        </Button>
      </div>
      {createElement(isOpen ? ProxyList : ProxyListSummaryView, {
        all,
        now,
        isSelectable,
        itemOnTapCallback,
      })}
    </div>
  );
}

export const ProxyGroup = connect((s, { name, delay }) => {
  const collapsibleIsOpen = getCollapsibleIsOpen(s);
  const proxySortBy = getProxySortBy(s);
  const hideUnavailableProxies = getHideUnavailableProxies(s);

  return {
    delay,
    hideUnavailableProxies,
    proxySortBy,
    isOpen: collapsibleIsOpen[`proxyGroup:${name}`],
  };
})(ProxyGroupImpl);
