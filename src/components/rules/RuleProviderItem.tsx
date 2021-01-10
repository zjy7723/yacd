import { formatDistance } from 'date-fns';
import * as React from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { refreshRuleProviderByName } from 'src/api/rule-provider';
import Button from 'src/components/Button';
import { RotatableRotateCw } from 'src/components/shared/AnimatedRotateCW';
import { SectionNameType } from 'src/components/shared/Basic';
// import { framerMotionResouce } from 'src/misc/motion';
import { ClashAPIConfig } from 'src/types';

import s from './RuleProviderItem.module.css';

const { useCallback } = React;

function useRefresh(
  name: string,
  apiConfig: ClashAPIConfig
): [(ev: React.MouseEvent<HTMLButtonElement>) => unknown, boolean] {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(refreshRuleProviderByName, {
    onSuccess: () => {
      queryClient.invalidateQueries('/providers/rules');
    },
  });

  const onClickRefreshButton = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      mutate({ name, apiConfig });
    },
    [apiConfig, mutate, name]
  );

  return [onClickRefreshButton, isLoading];
}

export function RuleProviderItem({
  idx,
  name,
  vehicleType,
  behavior,
  updatedAt,
  ruleCount,
  apiConfig,
}) {
  const [onClickRefreshButton, isRefreshing] = useRefresh(name, apiConfig);
  const timeAgo = formatDistance(new Date(updatedAt), new Date());
  return (
    <div className={s.RuleProviderItem}>
      <span className={s.left}>{idx}</span>
      <div className={s.middle}>
        <SectionNameType name={name} type={`${vehicleType} / ${behavior}`} />
        <div className={s.gray}>
          {ruleCount < 2 ? `${ruleCount} rule` : `${ruleCount} rules`}
        </div>
        <small className={s.gray}>Updated {timeAgo} ago</small>
      </div>
      <span className={s.refreshButtonWrapper}>
        <Button onClick={onClickRefreshButton} disabled={isRefreshing}>
          <RotatableRotateCw isRotating={isRefreshing} />
        </Button>
      </span>
    </div>
  );
}
