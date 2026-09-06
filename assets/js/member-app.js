(function(){

  const $ = (selector, root=document) =>
    root.querySelector(selector);

  const $$ = (selector, root=document) =>
    [...root.querySelectorAll(selector)];

  window.Crow = {

    esc(value){
      return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#039;"
        }[char]));
    },

    initials(name){
      return (name || "Member")
        .trim()
        .split(/\s+/)
        .slice(0,2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
    },

    toast(message){
      const toast = $("#toast");
      if(!toast) return;

      toast.textContent = message;
      toast.style.display = "block";

      clearTimeout(toast._timer);

      toast._timer = setTimeout(() => {
        toast.style.display = "none";
      },2800);
    },

    async client(){

      if(!window.supabase) return null;

      if(window.__crowSupabase)
        return window.__crowSupabase;

      if(
        !window.CROW_SUPABASE_URL ||
        window.CROW_SUPABASE_URL.includes("YOUR_")
      ){
        return null;
      }

      window.__crowSupabase =
        supabase.createClient(
          window.CROW_SUPABASE_URL,
          window.CROW_SUPABASE_PUBLISHABLE_KEY
        );

      return window.__crowSupabase;
    },

    async user(){

      const client = await this.client();

      if(!client) return null;

      const result =
        await client.auth.getUser();

      return result.data?.user || null;
    },

    async profile(){

      const user = await this.user();

      if(!user) return null;

      const client = await this.client();

      let profile = null;

      if(client){

        const result =
          await client
            .from("cr_profiles")
            .select("*")
            .eq("id",user.id)
            .maybeSingle();

        profile = result.data || null;
      }

      const output = {
        id:user.id,
        email:user.email || "",
        ...(profile || {}),

        display_name:
          profile?.display_name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Member",

        avatar_url:
          profile?.avatar_url ||
          user.user_metadata?.avatar_url ||
          "",

        bio:
          profile?.bio ||
          ""
      };

      $$("#memberName")
        .forEach(el =>
          el.textContent = output.display_name
        );

      $$("#memberEmail")
        .forEach(el =>
          el.textContent = output.email
        );

      $$(".memberAvatar")
        .forEach(el => {

          if(output.avatar_url){

            el.innerHTML =
              `<img src="${this.esc(output.avatar_url)}"
                    alt="Member avatar">`;

          }else{

            el.textContent =
              this.initials(output.display_name);
          }

        });

      return output;
    },

    async requireAuth(){

      const user = await this.user();

      if(!user){

        location.href =
          "../index.html";

        return null;
      }

      return user;
    },

    async signOut(){

      const client = await this.client();

      if(client)
        await client.auth.signOut();

      location.href =
        "../index.html";
    }

  };

  document.addEventListener("click",event => {

    if(event.target.closest("[data-menu]")){

      $("#sidebar")?.classList.toggle("open");
    }

    if(event.target.closest("[data-signout]")){

      event.preventDefault();

      Crow.signOut();
    }

  });

  document.addEventListener("DOMContentLoaded",async()=>{

    $$("[data-page]").forEach(link => {

      if(
        link.dataset.page ===
        document.body.dataset.page
      ){
        link.classList.add("active");
      }

    });

    await Crow.profile();

    $$("[data-year]")
      .forEach(el =>
        el.textContent =
        new Date().getFullYear()
      );

  });

})();