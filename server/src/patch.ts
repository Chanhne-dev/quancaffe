import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.resolve(process.cwd(), 'server', 'quancafe.db'));
db.exec("UPDATE VAT_TU_NGUYEN_LIEU SET DonViTinh = 'cái' WHERE DonViTinh = 'cai';");
db.exec("UPDATE CONG_THUC_MON SET DonViTinh = 'cái' WHERE DonViTinh = 'cai';");
db.exec("UPDATE DANH_MUC_MON SET DonViTinh = 'cái' WHERE DonViTinh = 'Cái' OR DonViTinh = 'cai';");
console.log('Unit cai -> cái patched successfully.');
