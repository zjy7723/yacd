import Tooltip from '@reach/tooltip';
import * as React from 'react';
import { RotateCw, Zap } from 'react-feather';
import { useTranslation } from 'react-i18next';
import Button from 'src/components/Button';
import ContentHeader from 'src/components/ContentHeader';
import { ClosePrevConns } from 'src/components/proxies/ClosePrevConns';
import { ProxyGroup } from 'src/components/proxies/ProxyGroup';
import { ProxyProviderList } from 'src/components/proxies/ProxyProviderList';
import Settings from 'src/components/proxies/Settings';
import { TextFilter } from 'src/components/proxies/TextFilter';
import BaseModal from 'src/components/shared/BaseModal';
import {
  Action,
  Fab,
  IsFetching,
  position as fabPosition,
} from 'src/components/shared/Fab';
import { connect, useStoreActions } from 'src/components/StateProvider';
import Equalizer from 'src/components/svg/Equalizer';
import { getClashAPIConfig } from 'src/store/app';
import {
  getShowModalClosePrevConns,
  requestDelayAll,
  useProxyQuery,
} from 'src/store/proxies';
import {
  DelayMapping,
  DispatchFn,
  FormattedProxyProvider,
  State,
} from 'src/store/types';
import { ClashAPIConfig } from 'src/types';

// import {useProxyProviderRefresher} from './hooks';
import s0 from './Proxies.module.css';

const { useState, useEffect, useCallback, useRef } = React;

type ProxyGroupListProps = {
  groupNames: string[];
  delay: DelayMapping;
  apiConfig: ClashAPIConfig;
  dispatch: DispatchFn;
};

function ProxyGroupList({
  groupNames,
  delay,
  apiConfig,
  dispatch,
}: ProxyGroupListProps) {
  return (
    <div>
      {groupNames.map((groupName: string) => {
        return (
          <div className={s0.group} key={groupName}>
            <ProxyGroup
              name={groupName}
              delay={delay}
              apiConfig={apiConfig}
              dispatch={dispatch}
            />
          </div>
        );
      })}
    </div>
  );
}

function FabIcon(isTestingLatency: boolean) {
  return isTestingLatency ? (
    <IsFetching>
      <Zap width={16} height={16} />
    </IsFetching>
  ) : (
    <Zap width={16} height={16} />
  );
}

function RefreshFab({
  isTestingLatency,
  requestDelayAllFn,
  proxyProviders,
}: {
  isTestingLatency: boolean;
  requestDelayAllFn: () => void;
  proxyProviders?: FormattedProxyProvider[];
}) {
  const { t } = useTranslation();
  // const [onClickRefreshButton, isUpdating] = useProxyProviderRefresher(name, apiConfig)
  return (
    <Fab
      icon={FabIcon(isTestingLatency)}
      onClick={requestDelayAllFn}
      text={t('Test Latency')}
      style={fabPosition}
    >
      {proxyProviders && proxyProviders.length > 0 ? (
        <Action text={t('Update All Proxy Providers')}>
          <RotateCw width={16} height={16} />
        </Action>
      ) : null}
    </Fab>
  );
}

function Proxies({ dispatch, apiConfig, showModalClosePrevConns }) {
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const requestDelayAllFn = useCallback(() => {
    if (isTestingLatency) return;

    setIsTestingLatency(true);
    dispatch(requestDelayAll(apiConfig)).then(
      () => setIsTestingLatency(false),
      () => setIsTestingLatency(false)
    );
  }, [apiConfig, dispatch, isTestingLatency]);

  const {
    data: { groupNames, delay, proxyProviders },
  } = useProxyQuery(apiConfig);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const {
    proxies: { closeModalClosePrevConns, closePrevConnsAndTheModal },
  } = useStoreActions();

  const { t } = useTranslation();

  return (
    <>
      <div className={s0.topBar}>
        <ContentHeader title={t('Proxies')} />
        <div className={s0.topBarRight}>
          <div className={s0.textFilterContainer}>
            <TextFilter />
          </div>
          <Tooltip label={t('settings')}>
            <Button kind="minimal" onClick={() => setIsSettingsModalOpen(true)}>
              <Equalizer size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>
      <ProxyGroupList
        groupNames={groupNames}
        delay={delay}
        apiConfig={apiConfig}
        dispatch={dispatch}
      />
      <ProxyProviderList items={proxyProviders} />
      <div style={{ height: 60 }} />
      <RefreshFab
        isTestingLatency={isTestingLatency}
        requestDelayAllFn={requestDelayAllFn}
        proxyProviders={proxyProviders}
      />
      <BaseModal
        isOpen={isSettingsModalOpen}
        onRequestClose={closeSettingsModal}
      >
        <Settings />
      </BaseModal>
      <BaseModal
        isOpen={showModalClosePrevConns}
        onRequestClose={closeModalClosePrevConns}
      >
        <ClosePrevConns
          onClickPrimaryButton={() => closePrevConnsAndTheModal(apiConfig)}
          onClickSecondaryButton={closeModalClosePrevConns}
        />
      </BaseModal>
    </>
  );
}

const mapState = (s: State) => ({
  apiConfig: getClashAPIConfig(s),
  showModalClosePrevConns: getShowModalClosePrevConns(s),
});

export default connect(mapState)(Proxies);
