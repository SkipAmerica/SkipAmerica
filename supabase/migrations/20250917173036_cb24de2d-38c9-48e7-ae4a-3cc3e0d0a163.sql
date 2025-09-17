-- Insert more platform stats for existing creators
INSERT INTO public.platform_stats (creator_id, platform, handle, follower_count, engagement_rate_30d, verified_on_platform, views_30d) VALUES
((SELECT id FROM public.creators WHERE full_name = 'Sarah Johnson'), 'pinterest', '@sarahbeautypin', 125000, 5.8, false, 2500000),
((SELECT id FROM public.creators WHERE full_name = 'Marcus Chen'), 'instagram', '@marcusgaming', 980000, 11.2, true, 8200000),
((SELECT id FROM public.creators WHERE full_name = 'Isabella Rodriguez'), 'tiktok', '@fitnessisabella', 680000, 22.1, true, 12000000),
((SELECT id FROM public.creators WHERE full_name = 'David Kim'), 'twitter', '@davidkimfinance', 340000, 4.8, false, 1200000),
((SELECT id FROM public.creators WHERE full_name = 'Emma Thompson'), 'tiktok', '@sustainableemma', 185000, 16.7, false, 3400000);

-- Add more offer rates
INSERT INTO public.offer_rates (creator_id, offer_type, min_rate, max_rate, currency) VALUES
((SELECT id FROM public.creators WHERE full_name = 'Sarah Johnson'), 'ugc_video', 250.00, 400.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Sarah Johnson'), 'story', 150.00, 250.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Marcus Chen'), 'ugc_video', 400.00, 700.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Isabella Rodriguez'), 'ugc_video', 120.00, 200.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Isabella Rodriguez'), 'social_post', 80.00, 150.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'David Kim'), 'appearance', 800.00, 1200.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'David Kim'), 'panel', 600.00, 900.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Emma Thompson'), 'ugc_video', 100.00, 180.00, 'USD'),
((SELECT id FROM public.creators WHERE full_name = 'Emma Thompson'), 'social_post', 60.00, 120.00, 'USD');

-- Add more press mentions for opted-in creators
INSERT INTO public.press_mentions (creator_id, outlet, headline, published_date, article_url) VALUES
((SELECT id FROM public.creators WHERE full_name = 'Sarah Johnson'), 'Vogue', 'Beauty Creator Shares Affordable Skincare Routine', '2024-01-10', 'https://example.com/vogue-article'),
((SELECT id FROM public.creators WHERE full_name = 'Marcus Chen'), 'The Verge', 'Gaming Influencer Reviews New Console Features', '2024-01-25', 'https://example.com/verge-article'),
((SELECT id FROM public.creators WHERE full_name = 'David Kim'), 'Wall Street Journal', 'Social Media Finance Educator Grows Following', '2024-01-12', 'https://example.com/wsj-article'),
((SELECT id FROM public.creators WHERE full_name = 'Emma Thompson'), 'BBC News', 'Climate Activist Promotes Sustainable Living Online', '2024-01-08', 'https://example.com/bbc-article');