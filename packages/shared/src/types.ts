export type ThemePreference = 'system' | 'light' | 'dark';
export type EntityKind =
  | 'wishlist'
  | 'date_idea'
  | 'media'
  | 'task'
  | 'shopping'
  | 'place'
  | 'event';

export type NotificationCategory =
  | 'invites'
  | 'partner'
  | 'events'
  | 'tasks'
  | 'reminders';

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  theme: ThemePreference;
}

export interface VersionedEntity {
  id: string;
  coupleId: string | null;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  clientRequestId: string;
}

export interface WishlistItem extends VersionedEntity {
  kind: 'wishlist';
  listId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  price: number | null;
  currency: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'wanted' | 'fulfilled';
}

export type DateCategory = 'home' | 'walk' | 'dinner' | 'cinema' | 'concert' | 'active' | 'trip' | 'surprise';

export interface DateIdea extends VersionedEntity {
  kind: 'date_idea';
  title: string;
  description: string | null;
  imageUrl: string | null;
  place: string | null;
  budget: number | null;
  currency: string | null;
  category: DateCategory;
  status: 'idea' | 'want' | 'visited';
  favorite: boolean;
}

export interface MediaItem extends VersionedEntity {
  kind: 'media';
  title: string;
  mediaType: 'movie' | 'series';
  genre: string | null;
  link: string | null;
  note: string | null;
  status: 'want' | 'watching' | 'watched';
}

export interface TaskItem extends VersionedEntity {
  kind: 'task';
  listId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: 'low' | 'normal' | 'high';
  assignee: 'me' | 'partner' | 'both';
  completed: boolean;
}

export interface ShoppingItem extends VersionedEntity {
  kind: 'shopping';
  listId: string;
  title: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  purchased: boolean;
}

export interface PlaceItem extends VersionedEntity {
  kind: 'place';
  title: string;
  address: string | null;
  mapUrl: string | null;
  category: 'restaurant' | 'cafe' | 'bar' | 'other';
  budget: number | null;
  currency: string | null;
  note: string | null;
  status: 'want' | 'visited';
}

export interface EventItem extends VersionedEntity {
  kind: 'event';
  title: string;
  description: string | null;
  category: 'date' | 'concert' | 'trip' | 'holiday' | 'other';
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  localStartDate: string | null;
  localEndDate: string | null;
  timezone: string;
  place: string | null;
  link: string | null;
  reminderOffsets: number[];
}

export type AppEntity = WishlistItem | DateIdea | MediaItem | TaskItem | ShoppingItem | PlaceItem | EventItem;

export interface PendingMutation {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  expectedVersion: number | null;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface SyncConflict {
  mutation: PendingMutation;
  local: Record<string, unknown>;
  server: Record<string, unknown>;
  serverVersion: number;
}
