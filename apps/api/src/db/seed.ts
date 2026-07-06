import bcrypt from 'bcryptjs';
import { db } from './index';

async function main() {
  const hash = await bcrypt.hash('Admin@123', 12);
  const branch = await db.query("INSERT INTO branches(name,slug,address,phone,gst_number,gst_percent) VALUES('Indian Kitchen','indian-kitchen','12 Park Street, Kolkata, West Bengal','+91 98765 43210','19ABCDE1234F1Z5',5) ON CONFLICT(slug) DO UPDATE SET name=excluded.name RETURNING id");
  const branchId = branch.rows[0].id;
  await db.query("INSERT INTO users(branch_id,name,email,password_hash,role) VALUES($1,'Restaurant Admin','admin@indiankitchen.local',$2,'admin') ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash", [branchId, hash]);
  const table = await db.query("INSERT INTO restaurant_tables(branch_id,name,capacity) VALUES($1,'Table 01',4) ON CONFLICT(branch_id,name) DO UPDATE SET capacity=excluded.capacity RETURNING qr_token", [branchId]);
  await db.query("DELETE FROM categories WHERE branch_id=$1 AND name LIKE 'Chef%' AND name <> $2", [branchId, "Chef's Specials"]);
  const categories: [string,string,number][] = [["Chef's Specials",'Signature dishes from our kitchen',1],['Tandoor & Kebab','Fire-kissed classics',2],['Indian Curries','Comforting gravies and curries',3],['Rice & Breads','The perfect companions',4],['Desserts & Drinks','A sweet finish',5]];
  for (const c of categories) await db.query('INSERT INTO categories(branch_id,name,description,sort_order) VALUES($1,$2,$3,$4) ON CONFLICT(branch_id,name) DO UPDATE SET description=excluded.description,sort_order=excluded.sort_order', [branchId,...c]);
  const items: [string,string,string,number,string,string][] = [
    ["Chef's Specials",'Royal Butter Chicken','Smoky tandoori chicken in silky tomato and cultured butter gravy',425,'non_veg','/images/menu/butter-chicken.jpg'],
    ["Chef's Specials",'Paneer Lababdar','Cottage cheese, tomato, cashew and fragrant spices',345,'veg','/images/menu/paneer-lababdar.jpg'],
    ['Tandoor & Kebab','Tandoori Chicken','Charred in the clay oven with yoghurt and Kashmiri chilli',395,'non_veg','/images/menu/tandoori-chicken.jpg'],
    ['Indian Curries','Dal Makhani','Slow-cooked black lentils finished with butter and cream',285,'veg','/images/menu/dal-makhani.jpg'],
    ['Indian Curries','Kosha Mangsho','Bengali slow-braised mutton with potatoes and warm spices',465,'non_veg','/images/menu/kosha-mangsho.jpg'],
    ['Rice & Breads','Lucknowi Chicken Biryani','Fragrant basmati, saffron and tender chicken, dum cooked',385,'non_veg','/images/menu/chicken-biryani.jpg'],
    ['Rice & Breads','Garlic Butter Naan','Clay-oven bread with garlic, coriander and butter',85,'veg','/images/menu/garlic-naan.jpg'],
    ['Desserts & Drinks','Baked Rasgulla','Warm baked chhena with condensed milk and pistachio',165,'veg','/images/menu/baked-rasgulla.jpg']
  ];
  for (const i of items) {
    await db.query('INSERT INTO menu_items(branch_id,category_id,name,description,price,food_type,image_url) SELECT $1::uuid,c.id,$3::varchar,$4::text,$5::numeric,$6::food_type,$7::text FROM categories c WHERE c.branch_id=$1::uuid AND c.name=$2::varchar AND NOT EXISTS(SELECT 1 FROM menu_items m WHERE m.branch_id=$1::uuid AND m.name=$3::varchar)', [branchId,...i]);
    await db.query('UPDATE menu_items SET image_url=$3,updated_at=now() WHERE branch_id=$1 AND name=$2', [branchId,i[1],i[5]]);
  }
  console.log(`Seeded. Admin: admin@indiankitchen.local / Admin@123\nTable QR token: ${table.rows[0].qr_token}`);
  await db.end();
}
main().catch(e => { console.error(e); process.exit(1); });
