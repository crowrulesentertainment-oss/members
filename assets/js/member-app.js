/*
=========================================================
 CROWRULES MEMBER HUB
 SUPABASE LIVE APP
=========================================================
*/

(function () {

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const Crow = {

    supabase: null,
    currentUser: null,
    currentProfile: null,

    esc(value) {
      return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[char]));
    },

    initials(name) {
      return (name || "Member")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
    },

    async initClient() {

      if (this.supabase)
        return this.supabase;

      if (!window.supabase)
        throw new Error(
          "Supabase JavaScript library was not loaded."
        );

      if (
        !window.CROW_SUPABASE_URL ||
        !window.CROW_SUPABASE_PUBLISHABLE_KEY ||
        window.CROW_SUPABASE_URL.includes("YOUR_") ||
        window.CROW_SUPABASE_PUBLISHABLE_KEY.includes("YOUR_")
      ) {
        throw new Error(
          "Supabase configuration is incomplete."
        );
      }

      this.supabase =
        window.supabase.createClient(
          window.CROW_SUPABASE_URL,
          window.CROW_SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );

      return this.supabase;
    },

    async getUser() {

      const client = await this.initClient();

      const {
        data,
        error
      } = await client.auth.getUser();

      if (error)
        throw error;

      return data?.user || null;
    },

    async loadProfile() {

      const client = await this.initClient();

      const user = this.currentUser ||
        await this.getUser();

      if (!user)
        return null;

      this.currentUser = user;

      const {
        data,
        error
      } = await client
        .from("cr_profiles")
        .select(`
          id,
          display_name,
          username,
          avatar_url,
          bio,
          role,
          is_active,
          created_at,
          updated_at
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (error)
        throw error;

      this.currentProfile = {

        id: user.id,

        email:
          user.email || "",

        display_name:
          data?.display_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Member",

        username:
          data?.username || "",

        avatar_url:
          data?.avatar_url ||
          user.user_metadata?.avatar_url ||
          "",

        bio:
          data?.bio || "",

        role:
          data?.role || "member",

        is_active:
          data?.is_active ?? true,

        created_at:
          data?.created_at || null,

        updated_at:
          data?.updated_at || null
      };

      this.renderMember();

      return this.currentProfile;
    },

    renderMember() {

      const profile = this.currentProfile;

      if (!profile)
        return;

      $$("#memberName").forEach(el => {
        el.textContent =
          profile.display_name;
      });

      $$("#memberEmail").forEach(el => {
        el.textContent =
          profile.email;
      });

      $$("#memberUsername").forEach(el => {
        el.textContent =
          profile.username
            ? "@" + profile.username
            : "";
      });

      $$("#memberBio").forEach(el => {
        el.textContent =
          profile.bio || "No bio added yet.";
      });

      $$("#memberRole").forEach(el => {
        el.textContent =
          profile.role || "member";
      });

      $$(".memberAvatar").forEach(el => {

        if (profile.avatar_url) {

          el.innerHTML = `
            <img
              src="${this.esc(profile.avatar_url)}"
              alt="Member avatar"
            >
          `;

        } else {

          el.textContent =
            this.initials(
              profile.display_name
            );
        }

      });
    },

    async requireAuth() {

      try {

        const user =
          await this.getUser();

        if (!user) {

          const next =
            encodeURIComponent(
              window.location.href
            );

          window.location.href =
            `../index.html?next=${next}`;

          return null;
        }

        this.currentUser = user;

        await this.loadProfile();

        return user;

      } catch (error) {

        console.error(
          "Member authentication error:",
          error
        );

        this.showError(
          "Unable to verify your Member Hub session."
        );

        return null;
      }
    },

    async updateProfile(values) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const payload = {};

      if ("display_name" in values)
        payload.display_name =
          values.display_name?.trim() || null;

      if ("username" in values)
        payload.username =
          values.username?.trim() || null;

      if ("avatar_url" in values)
        payload.avatar_url =
          values.avatar_url?.trim() || null;

      if ("bio" in values)
        payload.bio =
          values.bio?.trim() || null;

      const {
        data,
        error
      } = await client
        .from("cr_profiles")
        .update(payload)
        .eq("id", this.currentUser.id)
        .select()
        .single();

      if (error)
        throw error;

      await this.loadProfile();

      return data;
    },

    async getShows(limit = 50) {

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("shows")
        .select(`
          id,
          title,
          slug,
          description,
          thumbnail_url,
          banner_url,
          genre,
          status,
          is_active,
          is_published,
          created_at,
          updated_at,
          creator_id
        `)
        .eq("is_active", true)
        .eq("is_published", true)
        .order("title", {
          ascending: true
        })
        .limit(limit);

      if (error)
        throw error;

      return data || [];
    },

    async getSchedule(days = 7) {

      const client =
        await this.initClient();

      const start =
        new Date();

      const end =
        new Date(
          start.getTime() +
          days * 86400000
        );

      const {
        data,
        error
      } = await client
        .from("schedule_items")
        .select(`
          id,
          channel_id,
          show_id,
          episode_id,
          source_id,
          title,
          description,
          item_type,
          status,
          starts_at,
          ends_at,
          start_time,
          end_time,
          video_url,
          youtube_url,
          thumbnail_url,
          is_active,
          is_published,
          sort_order,
          metadata
        `)
        .eq("is_active", true)
        .eq("is_published", true)
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", {
          ascending: true
        });

      if (error)
        throw error;

      return data || [];
    },

    async getFavorites() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_favorites")
        .select("*")
        .eq(
          "user_id",
          this.currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async getMyList() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_my_list")
        .select("*")
        .eq(
          "user_id",
          this.currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async getWatchHistory() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_watch_history")
        .select("*")
        .eq(
          "user_id",
          this.currentUser.id
        )
        .order("watched_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async getNotifications() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_notifications")
        .select("*")
        .eq(
          "user_id",
          this.currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async getRewards() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_rewards")
        .select("*")
        .eq(
          "user_id",
          this.currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async getFriends() {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_friends")
        .select("*")
        .or(
          `user_id.eq.${this.currentUser.id},friend_id.eq.${this.currentUser.id}`
        )
        .order("created_at", {
          ascending: false
        });

      if (error)
        throw error;

      return data || [];
    },

    async addFavorite(item) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_favorites")
        .insert({
          user_id:
            this.currentUser.id,
          ...item
        })
        .select()
        .single();

      if (error)
        throw error;

      this.toast(
        "Added to Favorites."
      );

      return data;
    },

    async removeFavorite(id) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        error
      } = await client
        .from("member_favorites")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          this.currentUser.id
        );

      if (error)
        throw error;

      this.toast(
        "Removed from Favorites."
      );
    },

    async addToList(item) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_my_list")
        .insert({
          user_id:
            this.currentUser.id,
          ...item
        })
        .select()
        .single();

      if (error)
        throw error;

      this.toast(
        "Added to My List."
      );

      return data;
    },

    async removeFromList(id) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        error
      } = await client
        .from("member_my_list")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          this.currentUser.id
        );

      if (error)
        throw error;

      this.toast(
        "Removed from My List."
      );
    },

    async recordWatch(item) {

      if (!this.currentUser)
        await this.requireAuth();

      const client =
        await this.initClient();

      const {
        data,
        error
      } = await client
        .from("member_watch_history")
        .insert({
          user_id:
            this.currentUser.id,
          ...item
        })
        .select()
        .single();

      if (error)
        throw error;

      return data;
    },

    formatDate(value) {

      if (!value)
        return "";

      return new Intl.DateTimeFormat(
        undefined,
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      ).format(
        new Date(value)
      );
    },

    showError(message) {

      console.error(message);

      const errorBox =
        $("#memberError");

      if (errorBox) {

        errorBox.textContent =
          message;

        errorBox.style.display =
          "block";
      }

      this.toast(message);
    },

    toast(message) {

      const toast =
        $("#toast");

      if (!toast)
        return;

      toast.textContent =
        message;

      toast.style.display =
        "block";

      clearTimeout(
        toast._timer
      );

      toast._timer =
        setTimeout(() => {

          toast.style.display =
            "none";

        }, 3000);
    },

    async signOut() {

      try {

        const client =
          await this.initClient();

        await client.auth.signOut();

      } catch (error) {

        console.error(
          "Sign out failed:",
          error
        );

      }

      window.location.href =
        "../index.html";
    }
  };

  window.Crow = Crow;


  /* =====================================================
     GLOBAL MENU / BUTTONS
  ===================================================== */

  document.addEventListener(
    "click",
    event => {

      const menu =
        event.target.closest(
          "[data-menu]"
        );

      if (menu) {

        $("#sidebar")
          ?.classList
          .toggle("open");
      }

      const signOut =
        event.target.closest(
          "[data-signout]"
        );

      if (signOut) {

        event.preventDefault();

        Crow.signOut();
      }

    }
  );


  /* =====================================================
     DASHBOARD
  ===================================================== */

  async function loadDashboard() {

    const profile =
      await Crow.loadProfile();

    if (!profile)
      return;

    try {

      const [
        favorites,
        myList,
        history,
        notifications,
        rewards
      ] = await Promise.all([

        Crow.getFavorites(),
        Crow.getMyList(),
        Crow.getWatchHistory(),
        Crow.getNotifications(),
        Crow.getRewards()

      ]);

      $("#favoriteCount")
        ?.replaceChildren(
          document.createTextNode(
            favorites.length
          )
        );

      $("#myListCount")
        ?.replaceChildren(
          document.createTextNode(
            myList.length
          )
        );

      $("#historyCount")
        ?.replaceChildren(
          document.createTextNode(
            history.length
          )
        );

      $("#notificationCount")
        ?.replaceChildren(
          document.createTextNode(
            notifications.filter(
              x => !x.is_read
            ).length
          )
        );

      $("#rewardCount")
        ?.replaceChildren(
          document.createTextNode(
            rewards.length
          )
        );

    } catch (error) {

      console.error(
        "Dashboard load failed:",
        error
      );
    }
  }


  /* =====================================================
     PROFILE EDIT
  ===================================================== */

  async function setupProfileEditor() {

    const form =
      $("#profileForm");

    if (!form)
      return;

    const profile =
      await Crow.loadProfile();

    if (!profile)
      return;

    const fields = {

      display_name:
        $("#display_name"),

      username:
        $("#username"),

      avatar_url:
        $("#avatar_url"),

      bio:
        $("#bio")

    };

    if (fields.display_name)
      fields.display_name.value =
        profile.display_name || "";

    if (fields.username)
      fields.username.value =
        profile.username || "";

    if (fields.avatar_url)
      fields.avatar_url.value =
        profile.avatar_url || "";

    if (fields.bio)
      fields.bio.value =
        profile.bio || "";


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const button =
          form.querySelector(
            "[type='submit']"
          );

        if (button)
          button.disabled = true;

        try {

          await Crow.updateProfile({

            display_name:
              fields.display_name?.value,

            username:
              fields.username?.value,

            avatar_url:
              fields.avatar_url?.value,

            bio:
              fields.bio?.value

          });

          Crow.toast(
            "Profile saved successfully."
          );

        } catch (error) {

          console.error(error);

          Crow.showError(
            error.message ||
            "Unable to save profile."
          );

        } finally {

          if (button)
            button.disabled = false;
        }

      }
    );
  }


  /* =====================================================
     SHOWS
  ===================================================== */

  async function loadShows() {

    const container =
      $("#showsGrid");

    if (!container)
      return;

    try {

      const shows =
        await Crow.getShows();

      if (!shows.length) {

        container.innerHTML = `
          <div class="empty">
            <div class="empty-icon">📺</div>
            No published shows are available yet.
          </div>
        `;

        return;
      }

      container.innerHTML =
        shows.map(show => `

          <article class="media-card">

            <div
              class="media-art"
              ${show.thumbnail_url
                ? `style="background-image:url('${Crow.esc(show.thumbnail_url)}');background-size:cover;background-position:center"`
                : ""}
            >
              ${!show.thumbnail_url
                ? Crow.esc(show.title)
                : ""}
            </div>

            <div class="media-info">

              <div class="media-title">
                ${Crow.esc(show.title)}
              </div>

              <div class="media-meta">
                ${Crow.esc(show.genre || "CrowRules TV")}
              </div>

              <div class="actions" style="margin-top:10px">

                <button
                  class="btn btn-primary"
                  data-add-list
                  data-show-id="${show.id}"
                >
                  + My List
                </button>

                <button
                  class="btn"
                  data-favorite-show
                  data-show-id="${show.id}"
                >
                  ♡ Favorite
                </button>

              </div>

            </div>

          </article>

        `).join("");

    } catch (error) {

      console.error(
        "Shows load failed:",
        error
      );

      Crow.showError(
        "Unable to load CrowRules shows."
      );
    }
  }


  /* =====================================================
     TV GUIDE
  ===================================================== */

  async function loadGuide() {

    const container =
      $("#guideList");

    if (!container)
      return;

    try {

      const schedule =
        await Crow.getSchedule();

      if (!schedule.length) {

        container.innerHTML = `
          <div class="empty">
            <div class="empty-icon">📅</div>
            No published programming is scheduled.
          </div>
        `;

        return;
      }

      container.innerHTML =
        schedule.map(item => `

          <div class="list-row">

            <div class="list-main">

              <div class="list-title">
                ${Crow.esc(item.title)}
              </div>

              <div class="list-meta">

                ${Crow.formatDate(
                  item.starts_at ||
                  item.start_time
                )}

                ${
                  item.ends_at ||
                  item.end_time
                    ? " — " +
                      Crow.formatDate(
                        item.ends_at ||
                        item.end_time
                      )
                    : ""
                }

              </div>

            </div>

            <span class="badge">
              ${Crow.esc(
                item.item_type ||
                "PROGRAM"
              )}
            </span>

          </div>

        `).join("");

    } catch (error) {

      console.error(
        "TV Guide load failed:",
        error
      );

      Crow.showError(
        "Unable to load the TV Guide."
      );
    }
  }


  /* =====================================================
     PAGE INITIALIZATION
  ===================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    async () => {

      $$("[data-page]").forEach(
        link => {

          if (
            link.dataset.page ===
            document.body.dataset.page
          ) {

            link.classList.add(
              "active"
            );
          }

        }
      );

      $$("[data-year]")
        .forEach(el => {

          el.textContent =
            new Date()
              .getFullYear();

        });


      try {

        const user =
          await Crow.requireAuth();

        if (!user)
          return;

        const page =
          document.body.dataset.page;

        if (
          page === "dashboard"
        )
          await loadDashboard();

        if (
          page === "edit-profile"
        )
          await setupProfileEditor();

        if (
          page === "shows"
        )
          await loadShows();

        if (
          page === "tv-guide"
        )
          await loadGuide();

      } catch (error) {

        console.error(
          "Member Hub initialization failed:",
          error
        );

        Crow.showError(
          error.message ||
          "Member Hub failed to initialize."
        );
      }

    }
  );


  /* =====================================================
     DYNAMIC BUTTON ACTIONS
  ===================================================== */

  document.addEventListener(
    "click",
    async event => {

      const addList =
        event.target.closest(
          "[data-add-list]"
        );

      if (addList) {

        try {

          await Crow.addToList({
            show_id:
              addList.dataset.showId
          });

          addList.textContent =
            "✓ Added";

          addList.disabled =
            true;

        } catch (error) {

          Crow.showError(
            error.message ||
            "Unable to add item."
          );
        }

        return;
      }


      const favorite =
        event.target.closest(
          "[data-favorite-show]"
        );

      if (favorite) {

        try {

          await Crow.addFavorite({
            show_id:
              favorite.dataset.showId
          });

          favorite.textContent =
            "♥ Added";

          favorite.disabled =
            true;

        } catch (error) {

          Crow.showError(
            error.message ||
            "Unable to favorite show."
          );
        }

      }

    }
  );

})();
