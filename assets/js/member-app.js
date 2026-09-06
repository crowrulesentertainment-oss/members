/*
=========================================================
 CROWRULES MEMBER HUB
 SUPABASE AUTH + MEMBER DATA
 v2.0
=========================================================
*/

(function () {

  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


  const Crow = {

    client: null,
    user: null,
    profile: null,

   (function () {
  "use strict";

  window.Crow = window.Crow || {};

  let supabaseClient = null;

  function getConfig() {
    const url = window.CROW_SUPABASE_URL;
    const key = window.CROW_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key ||
        key === "YOUR_ACTUAL_SUPABASE_PUBLISHABLE_KEY" ||
        key === "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE") {
      throw new Error("Supabase configuration is incomplete.");
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error(
        "Supabase JavaScript library did not load. Check the CDN script."
      );
    }

    return { url, key };
  }

  function initClient() {
    if (supabaseClient) return supabaseClient;

    const config = getConfig();

    supabaseClient = window.supabase.createClient(
      config.url,
      config.key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "crowrules-member-auth"
        }
      }
    );

    return supabaseClient;
  }

  /*
   * Supports both:
   *
   * Crow.client()
   * Crow.client
   *
   * so existing Member Hub pages don't break.
   */
  Crow.client = function () {
    return initClient();
  };

  Crow.getClient = function () {
    return initClient();
  };

  Crow.supabase = function () {
    return initClient();
  };

  Crow.initClient = initClient;

})();

 /* ===================================================
       SUPABASE CLIENT
    =================================================== */

    async initClient() {

      if (this.client)
        return this.client;

      if (!window.supabase) {

        throw new Error(
          "Supabase JavaScript library did not load."
        );
      }

      const url =
        window.CROW_SUPABASE_URL;

      const key =
        window.CROW_SUPABASE_PUBLISHABLE_KEY;

      if (!url) {

        throw new Error(
          "CROW_SUPABASE_URL is missing."
        );
      }

      if (!key) {

        throw new Error(
          "CROW_SUPABASE_PUBLISHABLE_KEY is missing."
        );
      }

      if (
        key.includes("PASTE_") ||
        key.includes("YOUR_")
      ) {

        throw new Error(
          "Your Supabase publishable key has not been added to supabase-config.js."
        );
      }

      this.client =
        window.supabase.createClient(
          url,
          key,
          {
            auth: {

              persistSession: true,

              autoRefreshToken: true,

              detectSessionInUrl: true,

              storageKey:
                "crowrules-member-auth"

            }
          }
        );

      return this.client;
    },


    /* ===================================================
       SESSION
    =================================================== */

    async getSession() {

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client.auth.getSession();

      if (error)
        throw error;

      return data?.session || null;
    },


    /* ===================================================
       USER
    =================================================== */

    async getUser() {

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client.auth.getUser();

      if (error)
        throw error;

      return data?.user || null;
    },


    /* ===================================================
       AUTH CHECK
    =================================================== */

    async requireAuth() {

      try {

        const session =
          await this.getSession();

        if (!session) {

          console.warn(
            "CrowRules Member Hub: no active Supabase session."
          );

          this.showAuthMessage();

          return null;
        }

        this.user =
          session.user;

        console.log(
          "CrowRules Member Hub authenticated:",
          this.user.email
        );

        return this.user;

      } catch (error) {

        console.error(
          "Supabase authentication error:",
          error
        );

        this.showError(
          "Supabase authentication failed: " +
          (error.message || "Unknown error")
        );

        return null;
      }
    },


    /* ===================================================
       PROFILE
    =================================================== */

    async loadProfile() {

      if (!this.user)
        return null;

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
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
          .eq("id", this.user.id)
          .maybeSingle();

      if (error) {

        console.error(
          "cr_profiles error:",
          error
        );

        /*
          Authentication is working.
          Profile access is a separate issue.
        */

        this.showError(
          "Signed in, but the Member profile could not be loaded: " +
          error.message
        );

        return null;
      }

      if (!data) {

        console.warn(
          "No cr_profiles row exists for:",
          this.user.id
        );

        this.profile = {

          id: this.user.id,

          email:
            this.user.email || "",

          display_name:
            this.user.user_metadata?.display_name ||
            this.user.email?.split("@")[0] ||
            "Member",

          username: "",

          avatar_url: "",

          bio: "",

          role: "member",

          is_active: true

        };

      } else {

        this.profile = {

          ...data,

          email:
            this.user.email || "",

          display_name:
            data.display_name ||
            this.user.email?.split("@")[0] ||
            "Member"

        };

      }

      this.renderMember();

      return this.profile;
    },


    /* ===================================================
       MEMBER UI
    =================================================== */

    renderMember() {

      if (!this.profile)
        return;

      const profile =
        this.profile;

      $$("#memberName")
        .forEach(el => {

          el.textContent =
            profile.display_name ||
            "Member";

        });


      $$("#memberEmail")
        .forEach(el => {

          el.textContent =
            profile.email || "";

        });


      $$("#memberUsername")
        .forEach(el => {

          el.textContent =
            profile.username
              ? "@" + profile.username
              : "";

        });


      $$("#memberBio")
        .forEach(el => {

          el.textContent =
            profile.bio ||
            "No bio added yet.";

        });


      $$("#memberRole")
        .forEach(el => {

          el.textContent =
            profile.role ||
            "member";

        });


      $$(".memberAvatar")
        .forEach(el => {

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


    /* ===================================================
       SHOWS
    =================================================== */

    async getShows() {

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
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
            creator_id
          `)
          .eq("is_active", true)
          .eq("is_published", true)
          .order("title", {
            ascending: true
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       TV GUIDE
    =================================================== */

    async getSchedule() {

      const client =
        await this.initClient();

      const now =
        new Date();

      const future =
        new Date(
          now.getTime() +
          7 * 24 * 60 * 60 * 1000
        );

      const {
        data,
        error
      } =
        await client
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
            metadata
          `)
          .eq("is_active", true)
          .eq("is_published", true)
          .gte(
            "starts_at",
            now.toISOString()
          )
          .lte(
            "starts_at",
            future.toISOString()
          )
          .order("starts_at", {
            ascending: true
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       PROFILE UPDATE
    =================================================== */

    async updateProfile(values) {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const payload = {

        display_name:
          values.display_name?.trim() ||
          null,

        username:
          values.username?.trim() ||
          null,

        avatar_url:
          values.avatar_url?.trim() ||
          null,

        bio:
          values.bio?.trim() ||
          null

      };

      const {
        data,
        error
      } =
        await client
          .from("cr_profiles")
          .update(payload)
          .eq("id", this.user.id)
          .select()
          .single();

      if (error)
        throw error;

      await this.loadProfile();

      return data;
    },


    /* ===================================================
       FAVORITES
    =================================================== */

    async getFavorites() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_favorites")
          .select("*")
          .eq(
            "user_id",
            this.user.id
          )
          .order("created_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       MY LIST
    =================================================== */

    async getMyList() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_my_list")
          .select("*")
          .eq(
            "user_id",
            this.user.id
          )
          .order("created_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       WATCH HISTORY
    =================================================== */

    async getWatchHistory() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_watch_history")
          .select("*")
          .eq(
            "user_id",
            this.user.id
          )
          .order("watched_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       NOTIFICATIONS
    =================================================== */

    async getNotifications() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_notifications")
          .select("*")
          .eq(
            "user_id",
            this.user.id
          )
          .order("created_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       REWARDS
    =================================================== */

    async getRewards() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_rewards")
          .select("*")
          .eq(
            "user_id",
            this.user.id
          )
          .order("created_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       FRIENDS
    =================================================== */

    async getFriends() {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_friends")
          .select("*")
          .or(
            `user_id.eq.${this.user.id},friend_id.eq.${this.user.id}`
          )
          .order("created_at", {
            ascending: false
          });

      if (error)
        throw error;

      return data || [];
    },


    /* ===================================================
       ADD FAVORITE
    =================================================== */

    async addFavorite(values) {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_favorites")
          .insert({
            user_id:
              this.user.id,
            ...values
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


    /* ===================================================
       ADD TO LIST
    =================================================== */

    async addToList(values) {

      if (!this.user)
        throw new Error(
          "You are not signed in."
        );

      const client =
        await this.initClient();

      const {
        data,
        error
      } =
        await client
          .from("member_my_list")
          .insert({
            user_id:
              this.user.id,
            ...values
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


    /* ===================================================
       SIGN OUT
    =================================================== */

    async signOut() {

      try {

        const client =
          await this.initClient();

        await client.auth.signOut();

      } catch (error) {

        console.error(
          "Sign out error:",
          error
        );
      }

      window.location.href =
        "../index.html";
    },


    /* ===================================================
       HELPERS
    =================================================== */

    initials(name) {

      return (name || "Member")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
    },


    esc(value) {

      return String(value ?? "")
        .replace(
          /[&<>"']/g,
          char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
          }[char])
        );
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
        setTimeout(
          () => {
            toast.style.display =
              "none";
          },
          3000
        );
    },


    showError(message) {

      console.error(
        "CrowRules:",
        message
      );

      const box =
        $("#memberError");

      if (box) {

        box.textContent =
          message;

        box.style.display =
          "block";

      }

      this.toast(message);
    },


    showAuthMessage() {

      const box =
        $("#memberError");

      if (!box)
        return;

      box.innerHTML = `
        <strong>Member login required.</strong><br>
        Your Supabase session is not currently available.
        Please sign in through the CrowRules member login page.
      `;

      box.style.display =
        "block";
    }

  };


  window.Crow =
    Crow;


  /* =====================================================
     NAVIGATION
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


      const signout =
        event.target.closest(
          "[data-signout]"
        );

      if (signout) {

        event.preventDefault();

        Crow.signOut();

      }

    }
  );


  /* =====================================================
     PAGE START
  ===================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    async () => {

      $$("[data-page]")
        .forEach(link => {

          if (
            link.dataset.page ===
            document.body.dataset.page
          ) {

            link.classList.add(
              "active"
            );

          }

        });


      $$("[data-year]")
        .forEach(el => {

          el.textContent =
            new Date()
              .getFullYear();

        });


      try {

        const client =
          await Crow.initClient();

        console.log(
          "CrowRules Supabase client initialized."
        );

        /*
         Listen for future login/logout changes.
        */

        client.auth.onAuthStateChange(
          (event, session) => {

            console.log(
              "Supabase auth event:",
              event
            );

            if (
              session?.user
            ) {

              Crow.user =
                session.user;

            }

          }
        );


        const user =
          await Crow.requireAuth();

        if (!user)
          return;


        /*
         Profile is deliberately loaded
         separately from authentication.
        */

        await Crow.loadProfile();


      } catch (error) {

        console.error(
          "Member Hub startup error:",
          error
        );

        Crow.showError(
          error.message ||
          "Member Hub could not connect to Supabase."
        );

      }

    }
  );

})();
