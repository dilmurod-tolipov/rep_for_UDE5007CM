-- =============================================================================
-- Development seed data: catalogue categories and books.
--
-- Member and librarian accounts are seeded separately once password hashing is
-- in place, so that no plain-text or hand-written hash ever enters this file.
--
-- Re-running is safe: rows are matched on their natural keys.
-- =============================================================================

INSERT INTO categories (name, description) VALUES
  ('Computer Science', 'Programming, algorithms, networks and systems'),
  ('Mathematics',      'Pure and applied mathematics, statistics'),
  ('Fiction',          'Novels and short story collections'),
  ('History',          'World, regional and political history'),
  ('Business',         'Management, economics and entrepreneurship')
ON CONFLICT (name) DO NOTHING;

INSERT INTO books
  (title, author, isbn, category_id, published_year, total_copies, available_copies, cover_url, description)
VALUES
  ('Clean Code', 'Robert C. Martin', '9780132350884',
   (SELECT id FROM categories WHERE name = 'Computer Science'), 2008, 4, 4,
   'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg',
   'A handbook of agile software craftsmanship, focused on writing readable code.'),

  ('Computer Networking: A Top-Down Approach', 'James F. Kurose', '9780133594140',
   (SELECT id FROM categories WHERE name = 'Computer Science'), 2016, 3, 3,
   'https://covers.openlibrary.org/b/isbn/9780133594140-M.jpg',
   'Explains networking from the application layer downwards, including HTTP and DNS.'),

  ('Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320',
   (SELECT id FROM categories WHERE name = 'Computer Science'), 2017, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9781449373320-M.jpg',
   'The ideas behind reliable, scalable and maintainable data systems.'),

  ('Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305',
   (SELECT id FROM categories WHERE name = 'Computer Science'), 2022, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9780262046305-M.jpg',
   'Comprehensive reference covering algorithm design and analysis.'),

  ('Linear Algebra Done Right', 'Sheldon Axler', '9783319110790',
   (SELECT id FROM categories WHERE name = 'Mathematics'), 2015, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9783319110790-M.jpg',
   'Vector spaces and linear operators without determinants as a starting point.'),

  ('The Art of Statistics', 'David Spiegelhalter', '9780241398630',
   (SELECT id FROM categories WHERE name = 'Mathematics'), 2019, 3, 3,
   'https://covers.openlibrary.org/b/isbn/9780241398630-M.jpg',
   'How to learn from data, and how statistics is misused in public debate.'),

  ('Nineteen Eighty-Four', 'George Orwell', '9780141036144',
   (SELECT id FROM categories WHERE name = 'Fiction'), 1949, 5, 5,
   'https://covers.openlibrary.org/b/isbn/9780141036144-M.jpg',
   'A dystopian novel about surveillance, propaganda and the control of truth.'),

  ('The Remains of the Day', 'Kazuo Ishiguro', '9780571258246',
   (SELECT id FROM categories WHERE name = 'Fiction'), 1989, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9780571258246-M.jpg',
   'An English butler reflects on duty, dignity and a life of missed chances.'),

  ('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', '9780099590088',
   (SELECT id FROM categories WHERE name = 'History'), 2014, 4, 4,
   'https://covers.openlibrary.org/b/isbn/9780099590088-M.jpg',
   'A survey of human history from the cognitive revolution onwards.'),

  ('The Silk Roads', 'Peter Frankopan', '9781408839997',
   (SELECT id FROM categories WHERE name = 'History'), 2015, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9781408839997-M.jpg',
   'A new history of the world told through the networks that connected it.'),

  ('Thinking, Fast and Slow', 'Daniel Kahneman', '9780141033570',
   (SELECT id FROM categories WHERE name = 'Business'), 2011, 3, 3,
   'https://covers.openlibrary.org/b/isbn/9780141033570-M.jpg',
   'The two systems that drive the way we think, judge and decide.'),

  ('The Lean Startup', 'Eric Ries', '9780670921607',
   (SELECT id FROM categories WHERE name = 'Business'), 2011, 2, 2,
   'https://covers.openlibrary.org/b/isbn/9780670921607-M.jpg',
   'Building a business through validated learning and rapid iteration.')
ON CONFLICT (isbn) DO NOTHING;
