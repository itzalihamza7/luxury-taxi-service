Vehicle photos
==============

The site shows a line drawing for each vehicle until it has a photo.

To use a photo:
  1. Put the image in this folder, e.g. s-class.jpg (landscape, about 1600 x 680 px works well).
  2. Set the vehicle's image_url in the database to its public path:

       update vehicles set image_url = '/images/fleet/s-class.jpg' where slug = 'mercedes-s-class';

     (in development, open a SQL prompt with `ddev psql`)

Only use photographs you have the right to publish.
