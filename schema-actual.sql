-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.brand_info (
  id integer NOT NULL DEFAULT nextval('brand_info_id_seq'::regclass),
  brand_name character varying NOT NULL,
  title character varying NOT NULL,
  content text,
  category character varying,
  tags ARRAY,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  json_data jsonb,
  CONSTRAINT brand_info_pkey PRIMARY KEY (id)
);
CREATE TABLE public.popular_searches (
  id bigint NOT NULL DEFAULT nextval('popular_searches_id_seq'::regclass),
  query_text text NOT NULL UNIQUE,
  search_count integer NOT NULL DEFAULT 1,
  last_searched_at timestamp with time zone NOT NULL DEFAULT now(),
  avg_search_time_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT popular_searches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  name text NOT NULL,
  description text NOT NULL,
  categoria text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['equipo'::text, 'accesorio'::text, 'suministro'::text])),
  product_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  name_lower text,
  description_lower text,
  categoria_lower text,
  search_vector tsvector,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  priority integer DEFAULT 0,
  tags ARRAY DEFAULT '{}'::text[],
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.search_cache (
  id bigint NOT NULL DEFAULT nextval('search_cache_id_seq'::regclass),
  query_hash character varying NOT NULL UNIQUE,
  query_text text NOT NULL,
  results jsonb NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval),
  access_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT search_cache_pkey PRIMARY KEY (id)
);