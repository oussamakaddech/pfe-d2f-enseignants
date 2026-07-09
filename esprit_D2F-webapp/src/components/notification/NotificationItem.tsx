import { memo } from "react";
import { Badge, Button, Tooltip } from "antd";
import {
  BookOutlined, FileDoneOutlined, FileProtectOutlined, BulbOutlined,
  ThunderboltOutlined, MessageOutlined, SettingOutlined, CloseOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { AppNotification, NotificationCategory } from "@/models/notification";
import { CATEGORY_META } from "@/models/notification";

const CATEGORY_ICON: Record<NotificationCategory, typeof BookOutlined> = {
  FORMATION:   BookOutlined,
  EVALUATION:  FileDoneOutlined,
  CERTIFICAT:  FileProtectOutlined,
  BESOIN:      BulbOutlined,
  COMPETENCE:  ThunderboltOutlined,
  MESSAGE:     MessageOutlined,
  SYSTEM:      SettingOutlined,
};

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick: (n: AppNotification) => void;
}

const NotificationItem = memo(function NotificationItem({
  notification, onMarkRead, onRemove, onClick,
}: NotificationItemProps) {
  const meta = CATEGORY_META[notification.type];
  const Icon = CATEGORY_ICON[notification.type];

  const handleClick = () => {
    if (!notification.read) onMarkRead(notification.id);
    onClick(notification);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`notif-item ${notification.read ? "is-read" : "is-unread"}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      <span
        className="notif-item__icon"
        style={{ background: `${meta.color}1a`, color: meta.color }}
        aria-hidden
      >
        <Icon />
      </span>

      <div className="notif-item__body">
        <div className="notif-item__top">
          <span className="notif-item__cat" style={{ color: meta.color }}>
            {meta.label}
          </span>
          {!notification.read && <Badge status="processing" />}
        </div>
        <div className="notif-item__title">{notification.title}</div>
        <div className="notif-item__message">{notification.message}</div>
        <div className="notif-item__meta">
          {notification.actor && <span className="notif-item__actor">{notification.actor}</span>}
          <span className="notif-item__time">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
          </span>
        </div>
      </div>

      <Tooltip title="Supprimer">
        <button
          type="button"
          className="notif-item__close"
          aria-label="Supprimer la notification"
          onClick={(e) => { e.stopPropagation(); onRemove(notification.id); }}
        >
          <CloseOutlined />
        </button>
      </Tooltip>
    </motion.div>
  );
});

export default NotificationItem;
