import { memo, useMemo, useState } from 'react';
import { Badge, Button, Empty, Popover, Segmented, Space, Tooltip } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/notification';
import type { NotificationFilter } from '@/models/notification';
import NotificationItem from './NotificationItem';
import '@/styles/components/notification.css';

const STATUS_META = {
  connecting: { color: '#f59e0b', label: 'Connexion…', icon: DisconnectOutlined },
  open: { color: '#10b981', label: 'Temps réel', icon: WifiOutlined },
  mock: { color: '#3b82f6', label: 'Démo (temps réel)', icon: ExperimentOutlined },
  closed: { color: '#ef4444', label: 'Hors ligne', icon: DisconnectOutlined },
} as const;

const NotificationCenter = memo(function NotificationCenter() {
  const { notifications, unreadCount, status, markAsRead, markAllAsRead, remove, clearAll } =
    useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const unreadSuffix = unreadCount ? ` (${unreadCount})` : '';
  const unreadLabel = `Non lues${unreadSuffix}`;

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter],
  );

  const statusInfo = STATUS_META[status];
  const StatusIcon = statusInfo.icon;

  const handleItemClick = (n: { link?: string }) => {
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const content = (
    <div className="notif-panel">
      <div className="notif-panel__header">
        <div className="notif-panel__title">
          <span>Notifications</span>
          <Tooltip title={statusInfo.label}>
            <span className="notif-panel__status" style={{ color: statusInfo.color }}>
              <StatusIcon />
            </span>
          </Tooltip>
        </div>
        <Space size={4}>
          <Tooltip title="Tout marquer comme lu">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              disabled={unreadCount === 0}
              onClick={markAllAsRead}
            />
          </Tooltip>
          <Tooltip title="Tout effacer">
            <Button
              type="text"
              size="small"
              danger
              icon={<CloseOutlined />}
              disabled={notifications.length === 0}
              onClick={clearAll}
            />
          </Tooltip>
        </Space>
      </div>

      <Segmented<NotificationFilter>
        className="notif-panel__filter"
        size="small"
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'Toutes', value: 'all' },
          { label: unreadLabel, value: 'unread' },
        ]}
      />

      <div className="notif-panel__list">
        {visible.length === 0 ? (
          <Empty
            className="notif-panel__empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'
            }
          />
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={markAsRead}
                onRemove={remove}
                onClick={handleItemClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      title={null}
      classNames={{ root: 'notif-popover' }}
      rootClassName="notif-popover-root"
    >
      <Tooltip title="Notifications">
        <button type="button" className="app-header-icon-btn" aria-label="Notifications">
          <Badge count={unreadCount} size="small" offset={[-3, 3]} color="#b51200">
            <BellOutlined style={{ fontSize: 18, color: 'rgba(255,255,255,0.92)' }} />
          </Badge>
        </button>
      </Tooltip>
    </Popover>
  );
});

export default NotificationCenter;
