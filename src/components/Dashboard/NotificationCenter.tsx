import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, Flex, Button, Avatar, Tooltip } from 'monday-ui-react-core';
import Card from '../common/Card';

interface NotificationCenterProps {
  limit?: number;
}

interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'update' | 'due_date' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  entityId?: string;
  entityType?: 'board' | 'item' | 'workspace';
  entityName?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ limit = 10 }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch notifications from the monday.com API
        // For now, we'll use mock data
        
        // Mock data
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'mention',
            title: 'You were mentioned',
            message: 'Sarah mentioned you in a comment on "Homepage Redesign"',
            timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            read: false,
            user: {
              id: 'user-1',
              name: 'Sarah Johnson',
              avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
            },
            entityId: 'item-123',
            entityType: 'item',
            entityName: 'Homepage Redesign'
          },
          {
            id: '2',
            type: 'assignment',
            title: 'New task assigned',
            message: 'Alex assigned you to "API Integration" task',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            read: false,
            user: {
              id: 'user-2',
              name: 'Alex Chen',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
            },
            entityId: 'item-456',
            entityType: 'item',
            entityName: 'API Integration'
          },
          {
            id: '3',
            type: 'update',
            title: 'Status update',
            message: 'Task "Mobile Navigation" moved to "In Progress"',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
            read: true,
            user: {
              id: 'user-3',
              name: 'Michael Brown',
              avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
            },
            entityId: 'item-789',
            entityType: 'item',
            entityName: 'Mobile Navigation'
          },
          {
            id: '4',
            type: 'due_date',
            title: 'Due date approaching',
            message: '"User Testing" is due tomorrow',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
            read: true,
            entityId: 'item-101',
            entityType: 'item',
            entityName: 'User Testing'
          },
          {
            id: '5',
            type: 'system',
            title: 'System notification',
            message: 'Your workspace was updated with new features',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            read: true,
            entityId: 'workspace-1',
            entityType: 'workspace',
            entityName: 'Product Team'
          }
        ];
        
        setNotifications(mockNotifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // In a real implementation, we would set up a subscription to the monday.com API
    // for real-time updates
    
    return () => {
      // Clean up subscription in a real implementation
    };
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '💬'; // Comment/mention
      case 'assignment':
        return '📋'; // Assignment
      case 'update':
        return '🔄'; // Update
      case 'due_date':
        return '⏰'; // Due date
      case 'system':
        return '🔔'; // System notification
      default:
        return '📣'; // Default
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <Box style={{ textAlign: 'center', padding: '16px' }}>
        <Text>Loading notifications...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ textAlign: 'center', padding: '16px' }}>
        <Text style={{ color: 'var(--negative-color)' }}>{error}</Text>
      </Box>
    );
  }

  const unreadCount = notifications.filter(notification => !notification.read).length;
  const limitedNotifications = notifications.slice(0, limit);

  return (
    <Box className="notification-center">
      <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} style={{ marginBottom: '16px' }}>
        <Heading value="Notifications" size={Heading.sizes.MEDIUM} />
        {unreadCount > 0 && (
          <Flex align={Flex.align.CENTER} gap={8}>
            <Text style={{ fontWeight: 'bold' }}>{unreadCount} unread</Text>
            <Button
              size={Button.sizes.SMALL}
              kind={Button.kinds.TERTIARY}
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          </Flex>
        )}
      </Flex>
      
      {limitedNotifications.length > 0 ? (
        <Flex direction={Flex.directions.COLUMN} gap={8}>
          {limitedNotifications.map(notification => (
            <div 
              key={`notification-${notification.id}`}
              style={{ 
                backgroundColor: !notification.read 
                  ? 'var(--primary-background-hover-color)' 
                  : 'var(--primary-background-color)'
              }}
            >
              <Card className={`notification-card ${!notification.read ? 'notification-unread' : ''}`}>
                <Flex gap={12}>
                  <Box style={{ fontSize: '20px', marginTop: '2px' }}>
                    {getNotificationIcon(notification.type)}
                  </Box>
                  <Box style={{ flex: 1 }}>
                    <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER}>
                      <Text style={{ fontWeight: 'bold' }}>{notification.title}</Text>
                      <Text color={Text.colors.SECONDARY} style={{ fontSize: '12px' }}>
                        {formatTimestamp(notification.timestamp)}
                      </Text>
                    </Flex>
                    <Text>{notification.message}</Text>
                    
                    {notification.user && (
                      <Flex align={Flex.align.CENTER} gap={8} style={{ marginTop: '8px' }}>
                        <Avatar
                          size={Avatar.sizes.SMALL}
                          src={notification.user.avatar}
                          type={Avatar.types.IMG}
                          ariaLabel={notification.user.name}
                        />
                        <Text color={Text.colors.SECONDARY} style={{ fontSize: '12px' }}>
                          {notification.user.name}
                        </Text>
                      </Flex>
                    )}
                    
                    {!notification.read && (
                      <Box style={{ textAlign: 'right', marginTop: '8px' }}>
                        <Button
                          size={Button.sizes.SMALL}
                          kind={Button.kinds.TERTIARY}
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Card>
            </div>
          ))}
        </Flex>
      ) : (
        <Box style={{ textAlign: 'center', padding: '16px' }}>
          <Text color={Text.colors.SECONDARY}>No notifications to display.</Text>
        </Box>
      )}
      
      {notifications.length > limit && (
        <Box style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button
            size={Button.sizes.SMALL}
            kind={Button.kinds.TERTIARY}
            onClick={() => window.open('/notifications', '_blank')}
          >
            View all notifications
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default NotificationCenter;