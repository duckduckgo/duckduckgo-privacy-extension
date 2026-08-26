import { syncToStorage, getFromStorage } from '../wrapper';

const STORAGE_KEY = 'ntpFavorites';

/**
 * @typedef {object} StoredFavorite
 * @property {string} id - currently the favorite's url
 * @property {string} url
 * @property {string} title
 */

/**
 * Basic favorites container for the embedded New Tab Page, persisted in
 * chrome.storage.local. Kept in memory after the first read; writes are
 * fire-and-forget. Array order is the display order.
 *
 * Favorites are currently only added/removed via the NTP's activity feed
 * (activity_addFavorite / activity_removeFavorite) - the favorites widget's
 * own "add" action expects a native form (see ntp-messaging.js).
 */
export class NTPFavoritesStore {
    /** @type {Promise<StoredFavorite[]>?} */
    _loading = null;

    /**
     * @returns {Promise<StoredFavorite[]>} the live (mutable) list
     */
    _favorites() {
        if (!this._loading) {
            this._loading = getFromStorage(STORAGE_KEY).then((stored) => stored || []);
        }
        return this._loading;
    }

    /**
     * @returns {Promise<StoredFavorite[]>} favorites in display order
     */
    async getAll() {
        return [...(await this._favorites())];
    }

    /**
     * @returns {Promise<Set<string>>} the favorited urls
     */
    async getUrls() {
        return new Set((await this._favorites()).map((favorite) => favorite.url));
    }

    /**
     * @param {{ url: string, title: string }} favorite
     * @returns {Promise<boolean>} false if the url was already a favorite
     */
    async add({ url, title }) {
        const favorites = await this._favorites();
        if (favorites.some((favorite) => favorite.url === url)) {
            return false;
        }
        favorites.push({ id: url, url, title });
        this._persist(favorites);
        return true;
    }

    /**
     * @param {string} url
     * @returns {Promise<boolean>} whether a favorite was removed
     */
    async remove(url) {
        const favorites = await this._favorites();
        const index = favorites.findIndex((favorite) => favorite.url === url);
        if (index === -1) {
            return false;
        }
        favorites.splice(index, 1);
        this._persist(favorites);
        return true;
    }

    /**
     * Move a favorite to a new position in the display order.
     * @param {string} id
     * @param {number} targetIndex - zero-indexed target position
     * @returns {Promise<boolean>} whether anything moved
     */
    async move(id, targetIndex) {
        const favorites = await this._favorites();
        const index = favorites.findIndex((favorite) => favorite.id === id);
        if (index === -1 || typeof targetIndex !== 'number') {
            return false;
        }
        const [favorite] = favorites.splice(index, 1);
        favorites.splice(Math.max(0, Math.min(targetIndex, favorites.length)), 0, favorite);
        this._persist(favorites);
        return true;
    }

    /**
     * @param {StoredFavorite[]} favorites
     */
    _persist(favorites) {
        syncToStorage({ [STORAGE_KEY]: favorites });
    }
}
