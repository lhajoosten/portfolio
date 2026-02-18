export const ROUTES = {
  HOME: "/",
  PROJECTS: "/projects",
  PROJECT_DETAIL: (slug: string) => `/projects/${slug}`,
  BLOG: "/blog",
  POST_DETAIL: (slug: string) => `/blog/${slug}`,
  CERTIFICATIONS: "/certifications",
  ABOUT: "/about",
  CONTACT: "/contact",
  ADMIN: "/admin",
  ADMIN_PROJECTS: "/admin/projects",
  ADMIN_POSTS: "/admin/posts",
  ADMIN_CERTIFICATIONS: "/admin/certifications",
} as const;

export const QUERY_KEYS = {
  PROJECTS: "projects",
  POSTS: "posts",
  CERTIFICATIONS: "certifications",
  PROFILE: "profile",
} as const;
