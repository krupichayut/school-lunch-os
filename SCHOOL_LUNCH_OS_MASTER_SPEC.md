# School Lunch OS

## System Requirements, Database Blueprint & UX/UI Specification

**เอกสาร:** `SCHOOL_LUNCH_OS_MASTER_SPEC.md`\
**เวอร์ชัน:** 1.0\
**สถานะ:** Master Specification สำหรับส่งต่อให้ Antigravity\
**ภาษา:** ไทย (ชื่อระบบ ตาราง ฟิลด์ และสถานะใช้ภาษาอังกฤษ)\
**เขตเวลา:** Asia/Bangkok\
**วันที่จัดทำ:** 5 พฤศจิกายน 2026

------------------------------------------------------------------------

# 1. วัตถุประสงค์ของเอกสาร

เอกสารนี้เป็นข้อกำหนดหลักสำหรับการออกแบบและพัฒนา **School Lunch OS**
ระบบบริหารจัดการโครงการอาหารกลางวันของโรงเรียน ตั้งแต่การวางแผนเมนู คำนวณวัตถุดิบ
จัดซื้อ รับและตรวจสอบวัตถุดิบ จัดการคลัง บันทึกการเงิน อนุมัติเอกสาร และออกรายงาน

ให้ใช้เอกสารนี้เป็นแหล่งอ้างอิงหลัก (Single Source of Truth) ระหว่างการวิเคราะห์
ออกแบบ พัฒนา ทดสอบ และตรวจรับระบบ

> **ข้อสำคัญ:** เอกสารนี้เป็นข้อกำหนดเชิงระบบและแบบฐานข้อมูลระดับ
> Logical/Conceptual ยังไม่ใช่ SQL Migration
> ที่ผ่านการตรวจสอบทางกฎหมายหรือระเบียบราชการแล้ว ประเด็นที่ระบุว่า
> `ต้องยืนยันก่อนใช้งานจริง` ห้าม Antigravity
> ตัดสินใจแทนผู้ใช้หรืออ้างว่าระบบปฏิบัติตามระเบียบราชการครบถ้วนโดยไม่มีหลักฐาน

------------------------------------------------------------------------

# 2. เป้าหมายของระบบ

1.  ลดการทำงานด้วยเอกสารและ Spreadsheet ที่แยกจากกัน
2.  เชื่อมโยงข้อมูลตั้งแต่แผนอาหารไปจนถึงการใช้วัตถุดิบและค่าใช้จ่าย
3.  คำนวณปริมาณวัตถุดิบตามจำนวนผู้รับประทานในแต่ละวัน
4.  ควบคุมการจัดซื้อ การรับของ การตรวจสอบคุณภาพ และการเบิกใช้
5.  ตรวจสอบย้อนหลังได้ว่าใครทำรายการใด เมื่อใด และมีหลักฐานอะไร
6.  กำหนดผู้มีสิทธิ์และขั้นตอนอนุมัติได้ตามโครงสร้างของโรงเรียน
7.  สร้างรายงานและเอกสารที่โรงเรียนสามารถนำไปใช้ประกอบการดำเนินงานได้
8.  ใช้งานได้ทั้งคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์ โดยเฉพาะขั้นตอนรับวัตถุดิบ
9.  ป้องกันข้อมูลสูญหาย การบันทึกซ้ำ และการแก้ไขยอดคงเหลือโดยไม่มีประวัติ

# 3. ขอบเขตและสมมติฐานทางธุรกิจ

## 3.1 ขอบเขตที่ยืนยันแล้ว

  ------------------------------------------------------------------------
  หัวข้อ                                ข้อกำหนด
  ----------------------------------- ------------------------------------
  ขอบเขตการใช้งาน                      โรงเรียนเดียว (One School)

  ผู้ใช้งาน                              หลายคน (Multi-user)

  การเชื่อมต่อ                           Online

  งบประมาณ                            งบประมาณภาครัฐ

  จำนวนผู้รับประทาน                      กำหนดจำนวนประมาณการแยกแต่ละวัน ประมาณ
                                      90 คนเป็นค่าตั้งต้นโดยประมาณ ไม่ใช่ค่าคงที่

  รูปแบบอาหาร                          โรงเรียนกำหนดเมนูได้อย่างอิสระในแต่ละวัน

  การจัดซื้อ                             จัดซื้อวัตถุดิบเป็นรายวัน

  คลังวัตถุดิบ                            บันทึกเฉพาะการรับเข้าและการเบิกใช้ใน MVP

  การอนุมัติการเงิน                       โรงเรียนกำหนดลำดับขั้นตอนและผู้อนุมัติได้

  เอกสาร                              ระบบสร้างรายงาน/เอกสารจากข้อมูลในระบบ

  การตรวจรับ                           ต้องบันทึกจำนวนที่รับจริง ผลตรวจรับ
                                      และหลักฐานประกอบได้
  ------------------------------------------------------------------------

## 3.2 หลักการออกแบบ

-   ออกแบบให้เหมาะกับโรงเรียนเดียวก่อน ไม่สร้างความซับซ้อนแบบ SaaS
    หลายองค์กรโดยไม่จำเป็น
-   โครงสร้างข้อมูลควรมี `school_id` เพื่อระบุเจ้าของข้อมูลและรองรับการขยายในอนาคต
    แต่การแยกข้อมูลต้องไม่เพิ่มความซับซ้อนเกินความจำเป็น
-   จำนวนผู้รับประทานต้องแก้ไขได้รายวัน
-   เมนูและสูตรอาหารต้องปรับเปลี่ยนได้ตามวัน
-   การซื้อทุกวันไม่ได้หมายความว่าต้องรับของครบในครั้งเดียว ระบบต้องรองรับการรับบางส่วน
    (Partial Receiving)
-   รายการที่ผ่านการอนุมัติหรือบันทึกบัญชีแล้วไม่ควรถูกแก้ย้อนหลังโดยตรง
    ต้องใช้การยกเลิก/กลับรายการ (Reversal) พร้อม Audit Log
-   ห้ามแก้ยอดคงเหลือในคลังโดยตรงจากหน้าจอ
-   การอนุมัติและสิทธิ์ต้องตรวจสอบที่ Server/Database ไม่พึ่งการซ่อนปุ่มบน Frontend
    อย่างเดียว

## 3.3 สิ่งที่อยู่นอกขอบเขต MVP

-   AI สร้างเมนูหรือวางแผนอัตโนมัติ
-   OCR อ่านใบเสร็จหรือเอกสารอัตโนมัติ
-   ส่งใบสั่งซื้อไปยังร้านค้าโดยอัตโนมัติ
-   ระบบ Lot/Batch/วันหมดอายุแบบเต็มรูปแบบ
-   ระบบบัญชีแยกประเภทแบบ Double-entry Accounting เต็มรูปแบบ
-   เชื่อมต่อระบบราชการภายนอกโดยตรง
-   Native iOS/Android App
-   ระบบหลายโรงเรียนแบบ SaaS เต็มรูปแบบ
-   ระบบจ่ายเงินหรือโอนเงินผ่านธนาคารโดยตรง

------------------------------------------------------------------------

# 4. ผู้ใช้งานและสิทธิ์ (Roles & Permissions)

ระบบต้องรองรับผู้ใช้งานหลายคน และกำหนดสิทธิ์แยกตามบทบาท

## 4.1 บทบาทเริ่มต้น

  Role                หน้าที่หลัก
  ------------------- -----------------------------------------------
  `SYSTEM_ADMIN`      ดูแลระบบและการตั้งค่าทางเทคนิค
  `SCHOOL_ADMIN`      จัดการข้อมูลโรงเรียน ผู้ใช้ และการตั้งค่าทั่วไป
  `PLANNER`           วางแผนอาหาร เมนู สูตรอาหาร และจำนวนผู้รับประทาน
  `DUTY_TEACHER`      บันทึกการรับวัตถุดิบ ตรวจสอบคุณภาพ และเบิกวัตถุดิบตามสิทธิ์
  `FINANCE_OFFICER`   จัดทำรายการงบประมาณ ค่าใช้จ่าย และเอกสารการเงิน
  `EXECUTIVE`         ตรวจสอบภาพรวมและอนุมัติตาม Workflow ที่ได้รับมอบหมาย

บทบาทเป็นค่าเริ่มต้น โรงเรียนต้องเพิ่ม/ปรับสิทธิ์ได้ตามนโยบาย
แต่ไม่ควรให้ผู้ใช้ทั่วไปกำหนดสิทธิ์ตนเอง

## 4.2 หลักการ Permission

ควรใช้ Permission แบบละเอียด ไม่ตรวจสอบจากชื่อ Role ในโค้ดกระจัดกระจาย เช่น

-   `meal_plan.view`, `meal_plan.create`, `meal_plan.update`,
    `meal_plan.confirm`
-   `recipe.view`, `recipe.manage`
-   `purchase.view`, `purchase.create`, `purchase.submit`
-   `receiving.create`, `receiving.inspect`, `receiving.confirm`
-   `inventory.view`, `inventory.issue`, `inventory.adjust`
-   `finance.view`, `finance.create`, `finance.post`
-   `approval.view`, `approval.act`
-   `report.view`, `report.export`
-   `user.manage`, `settings.manage`

การมี Role `SCHOOL_ADMIN` ไม่ได้แปลว่าต้องเป็นผู้อนุมัติการเงินโดยอัตโนมัติ
ผู้อนุมัติต้องกำหนดผ่าน Approval Workflow แยกต่างหาก

## 4.3 Separation of Duties

-   ผู้สร้างรายการไม่ควรอนุมัติรายการของตนเอง (Self-approval prohibition)
    เป็นค่าเริ่มต้น
-   หากมีข้อยกเว้น ต้องเป็นการตั้งค่าที่ผู้มีอำนาจอนุมัติและมี Audit Log
-   ผู้อนุมัติหนึ่งคนไม่สามารถกดอนุมัติรายการเดิมซ้ำได้
-   ผู้ที่ไม่มีสิทธิ์ต้องไม่สามารถเรียก API เพื่อทำรายการแทนการกดปุ่มที่ถูกซ่อนได้

------------------------------------------------------------------------

# 5. ภาพรวมกระบวนการทำงาน (End-to-End Workflow)

``` mermaid
flowchart TD
    A[ตั้งค่าปีงบประมาณและข้อมูลพื้นฐาน] --> B[วางแผนอาหารรายวัน]
    B --> C[กำหนดจำนวนผู้รับประทาน]
    C --> D[เลือกเมนูและสูตรอาหาร]
    D --> E[คำนวณวัตถุดิบและต้นทุนประมาณการ]
    E --> F[สร้างรายการจัดซื้อ]
    F --> G[ส่งอนุมัติจัดซื้อ/งบประมาณ]
    G --> H{อนุมัติหรือไม่}
    H -- ไม่อนุมัติ/ส่งกลับ --> F
    H -- อนุมัติ --> I[ดำเนินการจัดซื้อ]
    I --> J[รับวัตถุดิบและตรวจสอบ]
    J --> K{ผลตรวจรับ}
    K -- ไม่ผ่าน --> L[บันทึกปฏิเสธ/ส่วนต่าง]
    K -- ผ่านบางส่วน --> M[รับเข้าคลังเฉพาะจำนวนที่ผ่าน]
    K -- ผ่านทั้งหมด --> M
    M --> N[เบิกวัตถุดิบไปประกอบอาหาร]
    N --> O[บันทึกการใช้จริง/ค่าใช้จ่ายตามหลักเกณฑ์]
    O --> P[บันทึกการเงินและชำระเงิน]
    P --> Q[รายงานและตรวจสอบย้อนหลัง]
```

## 5.1 กฎสำคัญของ Workflow

1.  แผนอาหารต้องมีวันที่และจำนวนผู้รับประทาน
2.  สูตรอาหารต้องระบุปริมาณวัตถุดิบต่อจำนวนเสิร์ฟอ้างอิง
3.  เมื่อยืนยันแผนอาหาร ระบบสร้าง Snapshot สูตรและต้นทุน ณ เวลายืนยัน
    เพื่อไม่ให้การแก้สูตรในอนาคตเปลี่ยนประวัติเดิม
4.  Purchase Order (PO) ต้องมีสถานะและประวัติการอนุมัติ
5.  การรับของต้องอ้างอิง PO และรายการ PO
6.  รับของได้หลายครั้งต่อ PO Item
7.  เฉพาะจำนวนที่ผ่านการตรวจรับเท่านั้นจึงจะเพิ่ม Stock
8.  การเบิกต้องสร้าง Inventory Movement ไม่ใช่แก้ Balance โดยตรง
9.  รายการการเงินต้องเชื่อมโยงเอกสารต้นทางได้
10. การยกเลิกหรือแก้รายการที่ Post แล้วต้องใช้ Reversal
    และสร้างรายการใหม่ตามความเหมาะสม

------------------------------------------------------------------------

# 6. สถาปัตยกรรมระบบที่แนะนำ

## 6.1 Technology Baseline

  -----------------------------------------------------------------------
  Layer                               แนวทางที่แนะนำ
  ----------------------------------- -----------------------------------
  Frontend                            Web Application แบบ Responsive

  Backend                             API/Server-side business logic

  Database                            PostgreSQL

  Authentication                      Supabase Auth หรือระบบ Auth
                                      ที่มีความปลอดภัยเทียบเท่า

  Authorization                       RBAC + Permission + Row Level
                                      Security

  File Storage                        Private Object Storage

  Date/Time                           เก็บ Timestamp แบบ timezone-aware
                                      และใช้ `Asia/Bangkok` ในการแสดงผล

  Money                               `NUMERIC` ห้ามใช้ Floating Point

  Quantity                            `NUMERIC` รองรับทศนิยมตามหน่วยวัด

  Primary Key                         UUID

  Audit                               Append-only Audit Log

  Export                              PDF และ Excel

  Deployment                          Online deployment พร้อม HTTPS และ
                                      Backup
  -----------------------------------------------------------------------

การใช้ Supabase เป็นข้อเสนอทางสถาปัตยกรรม ไม่ใช่การอนุมัติให้สร้าง Project
หรือเชื่อมต่อบริการจริงโดยอัตโนมัติ ก่อนสร้างทรัพยากรภายนอกให้รายงานค่าใช้จ่าย ข้อจำกัด
และขออนุมัติ

## 6.2 หลักการทางเทคนิค

-   ใช้ Database Transaction
    กับกระบวนการที่เปลี่ยนสถานะทางธุรกิจหรือยอดคลัง/การเงิน
-   ป้องกัน Race Condition ด้วย Row Lock/Optimistic Concurrency
    ตามความเหมาะสม
-   มี Unique Constraint สำหรับรหัสเอกสารและการป้องกันบันทึกซ้ำ
-   ใช้ Server-side validation ทุกจุดที่มีผลต่อเงิน คลัง และการอนุมัติ
-   ห้ามเก็บ Service Role Key หรือ Secret ใน Browser
-   ไฟล์เอกสารและภาพหลักฐานต้องเป็น Private
-   ใช้ Signed URL อายุสั้นเมื่อต้องแสดงไฟล์
-   มี Backup และทดสอบ Restore จริง
-   ไม่บันทึกข้อมูลส่วนบุคคลหรือข้อมูลลับลง Log โดยไม่จำเป็น

------------------------------------------------------------------------

# 7. Database Blueprint

## 7.1 Naming Convention

-   Table: `snake_case` และใช้ชื่อพหูพจน์ เช่น `meal_plans`
-   Column: `snake_case`
-   Primary Key: `id UUID`
-   Foreign Key: `<referenced_entity>_id`
-   วันเวลา: `created_at`, `updated_at`, `deleted_at` (ใช้ Soft Delete
    เฉพาะกรณีที่เหมาะสม)
-   ผู้สร้าง/แก้ไข: `created_by`, `updated_by`
-   สถานะ: `status` ใช้ค่าที่กำหนดชัดเจน
-   จำนวนเงิน: `NUMERIC(14,2)` หรือ precision ที่เหมาะสม
-   ปริมาณ: `NUMERIC(14,4)` หรือ precision ที่เหมาะสม
-   ห้ามใช้ `FLOAT`/`REAL` สำหรับเงิน
-   ตารางธุรกรรมสำคัญควรมี `school_id`, `created_at`, `created_by`

## 7.2 Domain 1 --- School & Identity

### `schools`

-   `id UUID PK`
-   `name TEXT NOT NULL`
-   `school_code TEXT`
-   `address JSONB`
-   `phone TEXT`
-   `settings JSONB`
-   `created_at TIMESTAMPTZ`
-   `updated_at TIMESTAMPTZ`

### `profiles`

-   `id UUID PK` เชื่อมกับ Auth User
-   `display_name TEXT NOT NULL`
-   `email TEXT`
-   `phone TEXT`
-   `is_active BOOLEAN`
-   `created_at`, `updated_at`

### `school_members`

-   `id UUID PK`
-   `school_id UUID FK`
-   `user_id UUID FK`
-   `membership_status TEXT`
-   `joined_at TIMESTAMPTZ`
-   Unique (`school_id`, `user_id`)

### `roles`

-   `id UUID PK`
-   `school_id UUID NULL` (NULL สำหรับ System Role)
-   `code TEXT`
-   `name TEXT`
-   `description TEXT`
-   `is_system BOOLEAN`

### `permissions`

-   `id UUID PK`
-   `code TEXT UNIQUE`
-   `description TEXT`

### `role_permissions`

-   `role_id UUID FK`
-   `permission_id UUID FK`
-   Composite PK (`role_id`, `permission_id`)

### `user_roles`

-   `school_id UUID FK`
-   `user_id UUID FK`
-   `role_id UUID FK`
-   Composite/Unique constraint ตามขอบเขตการกำหนด Role

## 7.3 Domain 2 --- Menu & Recipe

### `meal_plans`

-   `id UUID PK`
-   `school_id UUID FK`
-   `meal_date DATE NOT NULL`
-   `estimated_diners INTEGER NOT NULL CHECK > 0`
-   `actual_diners INTEGER NULL CHECK >= 0`
-   `status TEXT` เช่น `DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`
-   `notes TEXT`
-   `confirmed_at TIMESTAMPTZ`
-   `confirmed_by UUID FK`
-   Unique (`school_id`, `meal_date`) หากกำหนดให้มีหนึ่งแผนต่อวัน

### `meal_plan_items`

-   `id UUID PK`
-   `meal_plan_id UUID FK`
-   `menu_id UUID FK`
-   `servings INTEGER`
-   `sequence_no INTEGER`
-   `recipe_snapshot JSONB`
-   `estimated_cost NUMERIC(14,2)`
-   `notes TEXT`

### `menus`

-   `id UUID PK`
-   `school_id UUID FK`
-   `name TEXT`
-   `category TEXT`
-   `description TEXT`
-   `instructions TEXT`
-   `is_active BOOLEAN`

### `recipes`

-   `id UUID PK`
-   `school_id UUID FK`
-   `menu_id UUID FK`
-   `version INTEGER`
-   `servings_base NUMERIC(12,2)`
-   `instructions TEXT`
-   `status TEXT`
-   `effective_from DATE`
-   `created_by UUID FK`

### `recipe_items`

-   `id UUID PK`
-   `recipe_id UUID FK`
-   `ingredient_id UUID FK`
-   `quantity NUMERIC(14,4)`
-   `unit_id UUID FK`
-   `preparation_note TEXT`
-   `sequence_no INTEGER`

**Business Rules** - สูตรต้องระบุจำนวนเสิร์ฟอ้างอิง -
คำนวณปริมาณตามจำนวนผู้รับประทานด้วยอัตราส่วน - สูตรต้องมี Version -
เมื่อยืนยันแผนอาหารให้ Snapshot รายการวัตถุดิบ ปริมาณ หน่วย ราคา และต้นทุนที่ใช้คำนวณ -
การแก้สูตรใหม่ต้องไม่แก้ Snapshot ของแผนที่ยืนยันแล้ว

## 7.4 Domain 3 --- Ingredient & Unit

### `ingredients`

-   `id UUID PK`
-   `school_id UUID FK`
-   `code TEXT`
-   `name TEXT NOT NULL`
-   `category_id UUID FK NULL`
-   `base_unit_id UUID FK`
-   `purchase_unit_id UUID FK NULL`
-   `is_active BOOLEAN`
-   `notes TEXT`

### `ingredient_categories`

-   `id UUID PK`
-   `school_id UUID FK`
-   `name TEXT`
-   `parent_id UUID FK NULL`

### `units`

-   `id UUID PK`
-   `code TEXT UNIQUE`
-   `name TEXT`
-   `dimension TEXT` เช่น `MASS`, `VOLUME`, `COUNT`, `LENGTH`
-   `decimal_places INTEGER`

### `unit_conversions`

-   `id UUID PK`
-   `from_unit_id UUID FK`
-   `to_unit_id UUID FK`
-   `factor NUMERIC(18,8)`
-   `ingredient_id UUID FK NULL`
-   `notes TEXT`

### `ingredient_prices`

-   `id UUID PK`
-   `school_id UUID FK`
-   `ingredient_id UUID FK`
-   `supplier_id UUID FK NULL`
-   `unit_id UUID FK`
-   `unit_price NUMERIC(14,4)`
-   `effective_from DATE`
-   `effective_to DATE NULL`
-   `source_document_id UUID NULL`

**Business Rules** - การแปลงหน่วยต้องอยู่ในมิติเดียวกัน เช่น kg ↔ g - การแปลง kg
↔ L ต้องใช้ Density เฉพาะวัตถุดิบ ห้ามใช้ Conversion กลางแบบเหมารวม -
ราคาเก็บเป็นประวัติ มีวันเริ่ม/สิ้นสุดผลบังคับใช้ -
ห้ามมีช่วงราคาที่มีผลทับซ้อนกันสำหรับเงื่อนไขเดียวกัน เว้นแต่มีเหตุผลทางธุรกิจที่กำหนดไว้ -
สูตรและรายงานย้อนหลังต้องใช้ราคาที่ Snapshot ไว้ ไม่ดึงราคาปัจจุบันมาทับอดีต

## 7.5 Domain 4 --- Purchasing

### `suppliers`

-   `id UUID PK`
-   `school_id UUID FK`
-   `name TEXT`
-   `tax_id TEXT NULL`
-   `contact_name TEXT`
-   `phone TEXT`
-   `address JSONB`
-   `is_active BOOLEAN`

### `purchase_orders`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_no TEXT`
-   `order_date DATE`
-   `required_date DATE`
-   `supplier_id UUID FK`
-   `status TEXT`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ORDERED`,
    `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`
-   `subtotal NUMERIC(14,2)`
-   `discount NUMERIC(14,2)`
-   `tax_amount NUMERIC(14,2)`
-   `grand_total NUMERIC(14,2)`
-   `meal_plan_id UUID FK NULL`
-   `created_by UUID FK`
-   `approved_at TIMESTAMPTZ NULL`
-   `notes TEXT`

### `purchase_order_items`

-   `id UUID PK`
-   `purchase_order_id UUID FK`
-   `ingredient_id UUID FK`
-   `description TEXT`
-   `ordered_quantity NUMERIC(14,4)`
-   `unit_id UUID FK`
-   `unit_price NUMERIC(14,4)`
-   `line_total NUMERIC(14,2)`
-   `received_quantity NUMERIC(14,4)` (ค่าคำนวณ/สรุป ห้ามเชื่อ Frontend)
-   `notes TEXT`

**Business Rules** - เลขเอกสารต้องไม่ซ้ำในโรงเรียน/ปี/ประเภทเอกสาร - PO
ที่อนุมัติแล้วไม่ควรถูกแก้ไขโดยตรง หากต้องแก้ให้ใช้ Revision/Change Flow ที่มีประวัติ - PO
รองรับการรับของบางส่วน - ยอดรับสะสมต้องไม่เกินยอดสั่งซื้อ
เว้นแต่มีการอนุมัติส่วนเกินตามกฎที่กำหนด -
ต้องป้องกันการส่งอนุมัติหรือสร้างเอกสารซ้ำจากการกดซ้ำ

## 7.6 Domain 5 --- Receiving & Inspection

### `receiving_records`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_no TEXT`
-   `purchase_order_id UUID FK`
-   `received_at TIMESTAMPTZ`
-   `received_by UUID FK`
-   `status TEXT`: `DRAFT`, `INSPECTING`, `PARTIALLY_ACCEPTED`,
    `ACCEPTED`, `REJECTED`, `CANCELLED`
-   `notes TEXT`

### `receiving_items`

-   `id UUID PK`
-   `receiving_record_id UUID FK`
-   `purchase_order_item_id UUID FK`
-   `received_quantity NUMERIC(14,4)`
-   `accepted_quantity NUMERIC(14,4)`
-   `rejected_quantity NUMERIC(14,4)`
-   `unit_id UUID FK`
-   `inspection_status TEXT`: `PENDING`, `ACCEPTED`,
    `PARTIALLY_ACCEPTED`, `REJECTED`
-   `quality_note TEXT`
-   `discrepancy_note TEXT`

### `receiving_discrepancies`

-   `id UUID PK`
-   `receiving_item_id UUID FK`
-   `discrepancy_type TEXT`: `SHORTAGE`, `OVERAGE`, `QUALITY`,
    `DAMAGED`, `WRONG_ITEM`, `OTHER`
-   `expected_value NUMERIC(14,4) NULL`
-   `actual_value NUMERIC(14,4) NULL`
-   `description TEXT`
-   `resolution_status TEXT`
-   `resolved_by UUID FK NULL`
-   `resolved_at TIMESTAMPTZ NULL`

### `receiving_evidence`

-   `id UUID PK`
-   `receiving_item_id UUID FK`
-   `attachment_id UUID FK`
-   `evidence_type TEXT`: `PHOTO`, `DOCUMENT`, `OTHER`
-   `caption TEXT`
-   `created_at TIMESTAMPTZ`

**ข้อเสนอสำหรับการตรวจน้ำหนัก/จำนวนแพ็ก** -
หากโรงเรียนต้องตรวจน้ำหนักหลายครั้งหรือหลายแพ็ก ให้เพิ่ม `receiving_measurements`
แยกจาก `receiving_items` - ฟิลด์ที่อาจต้องมี: `package_count`,
`expected_weight`, `actual_weight`, `weight_unit_id`, `tolerance`,
`measurement_method`, `measured_by`, `measured_at` -
ห้ามใช้ฟิลด์น้ำหนักเดียวแทนจำนวนซื้อและจำนวนรับโดยไม่ระบุหน่วยให้ชัดเจน

**Business Rules** - ต้องอ้างอิง PO Item - รองรับรับหลายรอบ -
จำนวนรับจริงต้องแยกจากจำนวนผ่านตรวจ - Stock In เฉพาะจำนวน
`accepted_quantity` - การอัปเดตยอดรับสะสมและ Stock Movement ต้องอยู่ใน
Database Transaction เดียวกัน - ต้อง
Lock/ตรวจยอดรับสะสมเพื่อป้องกันรับเกินหรือรับซ้ำ - หลักฐานภาพต้องเก็บใน Private
Storage และมีการควบคุมสิทธิ์

## 7.7 Domain 6 --- Inventory & Stock Ledger

### `inventory_balances`

-   `id UUID PK`
-   `school_id UUID FK`
-   `ingredient_id UUID FK`
-   `location_id UUID FK NULL`
-   `quantity_on_hand NUMERIC(14,4)`
-   `updated_at TIMESTAMPTZ`
-   Unique (`school_id`, `ingredient_id`, `location_id`)

### `inventory_movements`

-   `id UUID PK`
-   `school_id UUID FK`
-   `ingredient_id UUID FK`
-   `movement_type TEXT`: `RECEIPT`, `ISSUE`, `RETURN`, `ADJUSTMENT`,
    `REVERSAL`
-   `quantity NUMERIC(14,4)` (เก็บทิศทางตามกฎที่กำหนดให้ชัดเจน)
-   `unit_id UUID FK`
-   `source_type TEXT`
-   `source_id UUID`
-   `occurred_at TIMESTAMPTZ`
-   `created_by UUID FK`
-   `idempotency_key TEXT NULL`
-   `reversal_of UUID FK NULL`
-   `notes TEXT`

### `inventory_issues`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_no TEXT`
-   `meal_plan_id UUID FK NULL`
-   `issued_at TIMESTAMPTZ`
-   `issued_by UUID FK`
-   `status TEXT`: `DRAFT`, `POSTED`, `CANCELLED`

### `inventory_issue_items`

-   `id UUID PK`
-   `inventory_issue_id UUID FK`
-   `ingredient_id UUID FK`
-   `quantity NUMERIC(14,4)`
-   `unit_id UUID FK`
-   `notes TEXT`

**Business Rules** - `inventory_movements` เป็น Stock Ledger หลัก (Source
of Truth) - `inventory_balances` เป็นยอดสรุปเพื่ออ่านเร็ว ต้องสอดคล้องกับ
Ledger - Frontend ห้ามแก้ `inventory_balances` โดยตรง -
การรับ/เบิก/คืน/ปรับปรุง ต้องสร้าง Movement และปรับ Balance ใน Transaction
เดียวกัน - ห้ามลบ Movement ที่ Post แล้ว ให้ทำ Reversal - ต้องป้องกันยอดติดลบ
เว้นแต่ผู้ใช้มีสิทธิ์และโรงเรียนเปิดใช้กฎดังกล่าวโดยชัดเจน - `source_type/source_id`
เป็น Polymorphic Reference ซึ่งไม่มี FK ปกติ ต้องออกแบบการตรวจสอบความถูกต้องด้วย
Typed Reference Tables, Trigger หรือแนวทางที่ชัดเจน ห้ามปล่อยให้เกิด Orphan
Reference - ต้องมีวิธี Reconcile ระหว่างยอด Balance และผลรวม Ledger

## 7.8 Domain 7 --- Budget & Finance

### `budget_allocations`

-   `id UUID PK`
-   `school_id UUID FK`
-   `fiscal_year INTEGER`
-   `budget_code TEXT`
-   `budget_name TEXT`
-   `allocated_amount NUMERIC(14,2)`
-   `revised_amount NUMERIC(14,2)`
-   `status TEXT`
-   `source_document_id UUID NULL`

### `financial_categories`

-   `id UUID PK`
-   `school_id UUID FK`
-   `code TEXT`
-   `name TEXT`
-   `category_type TEXT`: `INCOME`, `EXPENSE`
-   `is_active BOOLEAN`

### `financial_transactions`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_no TEXT`
-   `transaction_date DATE`
-   `transaction_type TEXT`: `INCOME`, `EXPENSE`, `ADJUSTMENT`,
    `REVERSAL`
-   `status TEXT`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `POSTED`,
    `CANCELLED`, `REVERSED`
-   `total_amount NUMERIC(14,2)`
-   `category_id UUID FK`
-   `budget_allocation_id UUID FK NULL`
-   `source_type TEXT NULL`
-   `source_id UUID NULL`
-   `created_by UUID FK`
-   `posted_at TIMESTAMPTZ NULL`
-   `notes TEXT`

### `financial_transaction_items`

-   `id UUID PK`
-   `financial_transaction_id UUID FK`
-   `description TEXT`
-   `quantity NUMERIC(14,4) NULL`
-   `unit_price NUMERIC(14,4) NULL`
-   `amount NUMERIC(14,2)`
-   `ingredient_id UUID FK NULL`

### `financial_commitments`

-   `id UUID PK`
-   `school_id UUID FK`
-   `source_type TEXT`
-   `source_id UUID`
-   `budget_allocation_id UUID FK`
-   `committed_amount NUMERIC(14,2)`
-   `released_amount NUMERIC(14,2)`
-   `status TEXT`
-   `created_at TIMESTAMPTZ`

### `financial_payments`

-   `id UUID PK`
-   `school_id UUID FK`
-   `financial_transaction_id UUID FK`
-   `payment_date DATE`
-   `amount NUMERIC(14,2)`
-   `payment_method TEXT`
-   `reference_no TEXT`
-   `status TEXT`
-   `evidence_attachment_id UUID FK NULL`

### `financial_documents`

-   `id UUID PK`
-   `school_id UUID FK`
-   `financial_transaction_id UUID FK`
-   `document_type TEXT`
-   `document_no TEXT`
-   `attachment_id UUID FK NULL`
-   `issued_at TIMESTAMPTZ NULL`

**Business Rules** - แยกงบที่ได้รับจัดสรร, ภาระผูกพัน, ค่าใช้จ่ายที่รับรู้
และการชำระเงินจริง - ห้ามนับ PO เป็นค่าใช้จ่ายซ้ำกับใบสำคัญ/รายการ Expense -
ต้องกำหนดจังหวะการรับรู้ค่าใช้จ่ายให้ชัดเจนก่อนใช้งานจริง - Commitment
ต้องลด/ปลดภาระผูกพันเมื่อ PO ถูกยกเลิก ปิด หรือมีการรับ/บันทึกค่าใช้จ่ายตามกฎที่กำหนด -
Payment อาจแบ่งจ่ายหลายครั้งได้ - สถานะ `POSTED` ต้องมีผลต่อยอดรายงาน
และไม่ควรแก้ไขโดยตรง - ระบบนี้เป็น Budget/Expense Tracking ไม่ใช่ระบบบัญชี
Double-entry เต็มรูปแบบ

## 7.9 Domain 8 --- Approval Workflow

### `workflow_definitions`

-   `id UUID PK`
-   `school_id UUID FK`
-   `code TEXT`
-   `name TEXT`
-   `document_type TEXT`
-   `is_active BOOLEAN`

### `workflow_versions`

-   `id UUID PK`
-   `workflow_definition_id UUID FK`
-   `version_no INTEGER`
-   `status TEXT`: `DRAFT`, `PUBLISHED`, `RETIRED`
-   `published_at TIMESTAMPTZ`
-   Unique (`workflow_definition_id`, `version_no`)

### `workflow_steps`

-   `id UUID PK`
-   `workflow_version_id UUID FK`
-   `step_order INTEGER`
-   `name TEXT`
-   `approval_mode TEXT`: `ANY_ONE`, `ALL`
-   `allow_return BOOLEAN`
-   `allow_reject BOOLEAN`
-   `timeout_days INTEGER NULL`

### `workflow_approvers`

-   `id UUID PK`
-   `workflow_step_id UUID FK`
-   `approver_type TEXT`: `ROLE`, `USER`
-   `approver_role_id UUID FK NULL`
-   `approver_user_id UUID FK NULL`

### `workflow_instances`

-   `id UUID PK`
-   `school_id UUID FK`
-   `workflow_version_id UUID FK`
-   `document_type TEXT`
-   `document_id UUID`
-   `status TEXT`: `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`,
    `CANCELLED`
-   `current_step_order INTEGER`
-   `started_at TIMESTAMPTZ`
-   `completed_at TIMESTAMPTZ NULL`

### `workflow_actions`

-   `id UUID PK`
-   `workflow_instance_id UUID FK`
-   `step_order INTEGER`
-   `actor_user_id UUID FK`
-   `action TEXT`: `APPROVE`, `REJECT`, `RETURN`, `COMMENT`
-   `comment TEXT`
-   `acted_at TIMESTAMPTZ`

**Business Rules** - เมื่อเริ่ม Workflow ให้ผูกกับ Workflow Version ที่ Published
แล้ว - การแก้ Workflow ภายหลังต้องไม่เปลี่ยนเส้นทางอนุมัติของรายการที่กำลังดำเนินการ -
ป้องกันการกดอนุมัติซ้ำด้วย Transaction/Unique Constraint/State Guard -
ตรวจสอบผู้อนุมัติจาก Role/ผู้ใช้และสิทธิ์ปัจจุบัน - ป้องกัน Self-approval เป็นค่าเริ่มต้น -
`document_type/document_id` เป็น Polymorphic Reference
ต้องมีการตรวจสอบความถูกต้อง - ไม่สร้างตาราง Approval แยกซ้ำซ้อน หาก
`workflow_instances` และ `workflow_actions` เป็นแหล่งข้อมูลหลักอยู่แล้ว

## 7.10 Domain 9 --- Documents & Audit

### `document_templates`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_type TEXT`
-   `name TEXT`
-   `template_version INTEGER`
-   `template_config JSONB`
-   `is_active BOOLEAN`

### `generated_documents`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_type TEXT`
-   `document_no TEXT`
-   `source_type TEXT`
-   `source_id UUID`
-   `file_attachment_id UUID FK`
-   `generated_by UUID FK`
-   `generated_at TIMESTAMPTZ`
-   `template_version INTEGER`

### `document_sequences`

-   `id UUID PK`
-   `school_id UUID FK`
-   `document_type TEXT`
-   `fiscal_year INTEGER`
-   `prefix TEXT`
-   `last_number BIGINT`
-   Unique (`school_id`, `document_type`, `fiscal_year`)

### `audit_logs`

-   `id UUID PK`
-   `school_id UUID FK`
-   `actor_user_id UUID FK NULL`
-   `action TEXT`
-   `entity_type TEXT`
-   `entity_id UUID`
-   `before_data JSONB NULL`
-   `after_data JSONB NULL`
-   `ip_address INET NULL`
-   `user_agent TEXT NULL`
-   `created_at TIMESTAMPTZ`

### `system_attachments`

-   `id UUID PK`
-   `school_id UUID FK`
-   `storage_bucket TEXT`
-   `storage_path TEXT`
-   `file_name TEXT`
-   `mime_type TEXT`
-   `file_size BIGINT`
-   `checksum TEXT NULL`
-   `uploaded_by UUID FK`
-   `created_at TIMESTAMPTZ`

**Business Rules** - ใช้ `system_attachments` เป็นทะเบียนไฟล์กลาง แล้วเชื่อมกับ
Receiving Evidence, Financial Documents และ Generated Documents -
หลีกเลี่ยงการเก็บ metadata ไฟล์ซ้ำหลายตาราง - Audit Log ต้องเพิ่มรายการได้
แต่ผู้ใช้ทั่วไปแก้หรือลบไม่ได้ - บันทึกเหตุการณ์สำคัญ เช่น Login ที่จำเป็น, Create, Update,
Submit, Approve, Reject, Receive, Stock In, Issue, Post, Reverse,
Export - หลีกเลี่ยงการเก็บข้อมูลส่วนบุคคลหรือข้อมูลลับใน Audit โดยไม่จำเป็น -
เลขเอกสารต้องสร้างใน Transaction และป้องกันเลขซ้ำเมื่อมีผู้ใช้พร้อมกันหลายคน

## 7.11 Domain 10 --- Application Settings & Operations

### `school_settings`

-   `id UUID PK`
-   `school_id UUID FK`
-   `setting_key TEXT`
-   `setting_value JSONB`
-   Unique (`school_id`, `setting_key`)

### `notifications`

-   `id UUID PK`
-   `school_id UUID FK`
-   `user_id UUID FK`
-   `type TEXT`
-   `title TEXT`
-   `body TEXT`
-   `read_at TIMESTAMPTZ NULL`
-   `created_at TIMESTAMPTZ`

### `idempotency_records`

-   `id UUID PK`
-   `school_id UUID FK`
-   `idempotency_key TEXT`
-   `operation TEXT`
-   `result_reference TEXT`
-   `created_at TIMESTAMPTZ`
-   Unique (`school_id`, `idempotency_key`, `operation`)

------------------------------------------------------------------------

# 8. กฎข้อมูลและความถูกต้อง (Data Integrity)

## 8.1 Tenant/School Ownership

-   ทุกข้อมูลทางธุรกิจต้องผูกกับ `school_id` โดยตรงหรือมีเส้นทาง FK
    ที่ตรวจสอบเจ้าของโรงเรียนได้
-   ห้ามเชื่อ `school_id` ที่ส่งมาจาก Browser โดยไม่ตรวจสอบ Membership
-   RLS และ Server Authorization ต้องป้องกันการอ่าน/เขียนข้อมูลข้ามโรงเรียน
    แม้ปัจจุบันมีโรงเรียนเดียว
-   FK ที่เชื่อมข้อมูลต้องตรวจสอบว่าอยู่ใน `school_id` เดียวกัน

## 8.2 Snapshot

Snapshot ต้องเก็บข้อมูลที่จำเป็นต่อการอธิบายผลคำนวณย้อนหลัง เช่น - สูตรและ Version -
รายการวัตถุดิบ - ปริมาณและหน่วย - ราคาต่อหน่วยและแหล่งราคา - จำนวนผู้รับประทาน -
จำนวนเสิร์ฟ - ต้นทุนรวมและต้นทุนต่อคน - วันที่และผู้ยืนยัน

อย่าใช้ JSONB แทนข้อมูลเชิงสัมพันธ์ทั้งหมด ให้ใช้เฉพาะข้อมูล Snapshot ที่ต้องตรึง ณ
เวลาหนึ่ง

## 8.3 Transaction & Concurrency

รายการต่อไปนี้ต้องทำแบบ Atomic Transaction: - อนุมัติ PO และสร้าง Commitment -
รับของและสร้าง Stock Movement/Update Balance - เบิกของและลด Stock - Post
รายการการเงิน - สร้างเลขเอกสาร - Reversal รายการ - อนุมัติ Workflow Step

ทุก Endpoint ที่มีโอกาสถูกเรียกซ้ำต้องมี Idempotency/State Guard

## 8.4 Referential Integrity

-   หลีกเลี่ยง Polymorphic Reference ที่ไม่มีวิธีตรวจสอบ
-   ถ้าใช้ `source_type/source_id` ต้องมี Trigger หรือ Typed Reference Table
    และ Automated Test
-   ห้ามลบข้อมูลต้นทางที่มีธุรกรรมอ้างอิงโดยไม่มีกระบวนการ Archive/Cancel/Reversal

------------------------------------------------------------------------

# 9. UX/UI Design Specification

## 9.1 Design Direction

แนวทางภาพรวม: **Clean Government Operations × Modern School
Administration**

คุณลักษณะ: - สะอาด อ่านง่าย เป็นทางการ แต่ไม่เก่า - ใช้สีหลักที่สื่อถึงความน่าเชื่อถือ เช่น
Navy/Blue และสีสถานะที่มีความหมาย - สีเขียว = สำเร็จ/ผ่าน, เหลือง = รอตรวจ/เตือน,
แดง = ไม่ผ่าน/ผิดพลาด - ใช้สีสถานะอย่างสม่ำเสมอและไม่พึ่งสีอย่างเดียว ต้องมีข้อความหรือ
Icon ประกอบ - หลีกเลี่ยง Dashboard ที่มีกราฟตกแต่งมากกว่าข้อมูลที่ใช้ตัดสินใจ -
เน้นการกรอกข้อมูลให้รวดเร็ว ลดการคลิก และมี Validation ที่ชัดเจน -
รองรับภาษาไทยเต็มรูปแบบและวันที่ไทยตามการตั้งค่า - ใช้ Font ที่อ่านภาษาไทยได้ดี

## 9.2 Responsive Breakpoints

  Device                      Width
  ----------------- ---------------
  Mobile                360--599 px
  Large Mobile          600--767 px
  Tablet               768--1023 px
  Compact Desktop     1024--1279 px
  Desktop              1280 px ขึ้นไป

## 9.3 Application Shell

### Desktop

-   Header: ชื่อระบบ, โรงเรียน, ปีงบประมาณ/วันที่, Notification, User Menu
-   Sidebar: เมนูหลัก
-   Main Content: Page Title, Breadcrumb, Action Area, Content
-   Footer/Status Area: เวอร์ชันระบบและสถานะการเชื่อมต่อ (ถ้าจำเป็น)

### Mobile

-   Header แบบกระชับ
-   Bottom Navigation สำหรับเมนูหลักที่ใช้บ่อย หรือ Drawer สำหรับเมนูทั้งหมด
-   รายการข้อมูลแสดงเป็น Card/Stack แทนตารางกว้าง
-   ฟอร์มรับของต้องใช้งานด้วยมือเดียวได้เท่าที่เหมาะสม
-   ปุ่มบันทึก/ยืนยันต้องเห็นชัดและไม่ทับเนื้อหา

## 9.4 Navigation

1.  Dashboard
2.  Meal Plan
3.  Menu & Recipe
4.  Ingredients
5.  Purchasing
6.  Receiving
7.  Inventory
8.  Finance & Budget
9.  Approvals
10. Reports
11. Settings

เมนูที่แสดงต้องสัมพันธ์กับ Permission ของผู้ใช้

## 9.5 Screen 1 --- Dashboard

องค์ประกอบ: - จำนวนผู้รับประทานวันนี้ - เมนูวันนี้ - สถานะการเตรียมวัตถุดิบ -
รายการจัดซื้อที่รออนุมัติ - รายการรับของที่รอตรวจ - รายการเบิกวัตถุดิบ -
งบประมาณที่ได้รับ/ใช้ไป/ผูกพัน/คงเหลือ - การแจ้งเตือนที่ต้องดำเนินการ - Recent
Activity

Dashboard ต้องแสดงเฉพาะข้อมูลที่ผู้ใช้มีสิทธิ์ดู และมี Quick Actions ตาม Role

## 9.6 Screen 2 --- Meal Planning

องค์ประกอบ: - เลือกวันที่/ช่วงวันที่ - จำนวนผู้รับประทานรายวัน - เพิ่มเมนูได้หลายรายการ -
เลือกสูตรอาหาร - แสดงปริมาณวัตถุดิบที่ต้องใช้ - ต้นทุนประมาณการรวมและต่อคน -
คัดลอกแผนจากวันก่อน - สร้างรายการจัดซื้อจากวัตถุดิบที่ขาด - สถานะ
Draft/Confirmed/Completed

Validation: - จำนวนผู้รับประทานต้องเป็นจำนวนเต็มมากกว่า 0 - ห้าม Confirm
หากเมนูไม่มีสูตรหรือสูตรไม่มีวัตถุดิบที่จำเป็น - แจ้งเตือนเมื่อราคาหรือหน่วยวัตถุดิบไม่ครบ - หลัง
Confirm ให้ Snapshot ข้อมูลที่ใช้คำนวณ

## 9.7 Screen 3 --- Menu & Recipe Builder

องค์ประกอบ: - ชื่อเมนู/หมวดหมู่/คำอธิบาย - จำนวนเสิร์ฟอ้างอิง - ตารางวัตถุดิบ: วัตถุดิบ,
ปริมาณ, หน่วย, ราคา, ต้นทุน - ขั้นตอนการปรุง - ต้นทุนรวม/ต้นทุนต่อเสิร์ฟ - Version
History - เปิด/ปิดการใช้งาน

ต้องแยก Recipe Version ที่ใช้งานอยู่จาก Version เก่า และห้ามแก้ Snapshot
ของแผนอาหารที่ยืนยันแล้ว

## 9.8 Screen 4 --- Ingredient Catalog

องค์ประกอบ: - ค้นหาและกรองหมวดหมู่ - ชื่อ/รหัสวัตถุดิบ - หน่วยฐานและหน่วยซื้อ -
Conversion - ราคาล่าสุดและประวัติราคา - Supplier ที่เกี่ยวข้อง - สถานะ
Active/Inactive

## 9.9 Screen 5 --- Purchasing

องค์ประกอบ: - สร้าง PO จากรายการวัตถุดิบที่ต้องซื้อ หรือสร้างเอง - Supplier -
วันที่สั่ง/วันที่ต้องการรับ - รายการวัตถุดิบ ปริมาณ หน่วย ราคา - ส่วนลด/ภาษี (ถ้ามี) -
ยอดรวม - เอกสารแนบ - Submit for Approval - Timeline สถานะ

ต้องแสดงยอดสั่ง ยอดรับสะสม และยอดคงเหลือที่ยังรับได้แยกกัน

## 9.10 Screen 6 --- Receiving & Inspection (Mobile-first)

เป็นหน้าจอสำคัญ ต้องออกแบบให้ใช้งานสะดวกขณะรับวัตถุดิบจริง

องค์ประกอบต่อรายการ: - ชื่อวัตถุดิบ - จำนวนที่สั่ง - จำนวนที่รับก่อนหน้า -
จำนวนที่รับรอบนี้ - หน่วย - จำนวนที่ผ่านตรวจ - จำนวนที่ไม่ผ่าน - สถานะคุณภาพ -
หมายเหตุส่วนต่าง - ถ่ายภาพ/แนบหลักฐาน

รองรับ: - รับครบ - รับบางส่วน - รับหลายรอบ - ปฏิเสธบางรายการ - ปฏิเสธทั้งหมด -
บันทึกของเสียหาย/ขาด/เกิน/ผิดชนิด - Save Draft ก่อน Confirm

กฎ: - ผลรวม `accepted_quantity + rejected_quantity` ต้องไม่เกิน
`received_quantity` - Stock In เฉพาะ accepted quantity - เมื่อ Confirm
แล้วให้แสดงเลขเอกสารและผลกระทบต่อคลัง - การ Confirm ต้องป้องกันการกดซ้ำ

## 9.11 Screen 7 --- Inventory

องค์ประกอบ: - คงเหลือแยกวัตถุดิบ - หน่วยฐาน - รายการรับเข้า - รายการเบิกใช้ -
รายการคืน/ปรับปรุง (ถ้าเปิดสิทธิ์) - ประวัติ Movement -
ตัวกรองตามวันที่/วัตถุดิบ/ประเภท - Export

MVP ไม่จำเป็นต้องมี Lot/Expiry เต็มรูปแบบ แต่ควรออกแบบให้เพิ่มภายหลังได้

## 9.12 Screen 8 --- Finance & Budget

องค์ประกอบ: - งบประมาณที่ได้รับจัดสรร - งบปรับปรุง - ภาระผูกพัน -
ค่าใช้จ่ายที่บันทึกแล้ว - ยอดชำระ - ยอดคงเหลือ - รายการรายรับ/รายจ่าย - หมวดหมู่ -
เอกสารแนบ - สถานะอนุมัติ/Post

ต้องแยกยอด Budget, Commitment, Expense และ Payment อย่างชัดเจน
ห้ามแสดงยอดรวมที่ทำให้เกิดการนับซ้ำ

## 9.13 Screen 9 --- Approval Center

องค์ประกอบ: - Inbox รายการรออนุมัติ - ประเภทเอกสาร - ผู้ส่ง/วันที่ส่ง - ยอดเงิน -
ขั้นตอนปัจจุบัน - รายละเอียดและเอกสารแนบ - Approve / Reject / Return -
Comment - Approval Timeline

ต้องตรวจสอบสิทธิ์และสถานะฝั่ง Server ทุกครั้ง

## 9.14 Screen 10 --- Reports Center

รายงาน MVP: 1. รายงานอาหารกลางวันประจำวัน 2. รายงานแผนเมนูรายเดือน 3.
รายงานสูตรอาหารและวัตถุดิบ 4. รายงานรายการจัดซื้อ 5. รายงานผลการตรวจรับ 6.
รายงานรับเข้า--เบิกใช้วัตถุดิบ 7. รายงานยอดคงเหลือวัตถุดิบ 8. รายงานงบประมาณ 9.
รายงานรายรับ--รายจ่าย 10. รายงานประวัติการอนุมัติ 11. รายงานต้นทุนอาหารต่อคน/ต่อวัน

ความสามารถ: - เลือกช่วงวันที่/ปีงบประมาณ - Filter ตามสถานะ/หมวดหมู่ - Preview
ก่อน Export - PDF และ Excel - แสดงวันเวลาและผู้จัดทำ - รายงานต้องสะท้อนข้อมูลที่
Post/Confirm แล้วตามกฎของรายงานนั้น - ระบุชัดเจนว่าเป็นรายงานจากระบบ
ไม่กล่าวอ้างว่าเป็นแบบฟอร์มราชการที่ได้รับการรับรอง เว้นแต่ผ่านการตรวจสอบแล้ว

## 9.15 Screen 11 --- Settings

-   ข้อมูลโรงเรียน
-   ปีงบประมาณ
-   ผู้ใช้และสมาชิก
-   Roles/Permissions
-   Approval Workflow
-   เลขที่เอกสารและรูปแบบเอกสาร
-   หน่วยวัดและ Conversion
-   หมวดหมู่วัตถุดิบ
-   หมวดหมู่การเงิน
-   การตั้งค่ารายงาน
-   Backup/Restore และการจัดการระบบตามสิทธิ์

------------------------------------------------------------------------

# 10. Status Dictionary

ค่าต่อไปนี้เป็นชุดเริ่มต้น ต้องใช้ให้สม่ำเสมอทั้ง Backend, Frontend และ Reports

  -----------------------------------------------------------------------
  Entity                              Status
  ----------------------------------- -----------------------------------
  Meal Plan                           `DRAFT`, `CONFIRMED`, `COMPLETED`,
                                      `CANCELLED`

  Purchase Order                      `DRAFT`, `PENDING_APPROVAL`,
                                      `APPROVED`, `ORDERED`,
                                      `PARTIALLY_RECEIVED`, `RECEIVED`,
                                      `CANCELLED`

  Receiving Record                    `DRAFT`, `INSPECTING`,
                                      `PARTIALLY_ACCEPTED`, `ACCEPTED`,
                                      `REJECTED`, `CANCELLED`

  Inspection                          `PENDING`, `ACCEPTED`,
                                      `PARTIALLY_ACCEPTED`, `REJECTED`

  Inventory Issue                     `DRAFT`, `POSTED`, `CANCELLED`

  Workflow                            `PENDING`, `APPROVED`, `REJECTED`,
                                      `RETURNED`, `CANCELLED`

  Financial Transaction               `DRAFT`, `PENDING_APPROVAL`,
                                      `APPROVED`, `POSTED`, `CANCELLED`,
                                      `REVERSED`

  Attachment                          `UPLOADED`, `QUARANTINED`,
                                      `AVAILABLE`, `DELETED`
                                      (ถ้าต้องใช้วงจรตรวจไฟล์)
  -----------------------------------------------------------------------

การเปลี่ยนสถานะต้องผ่าน State Transition Rules ห้ามแก้ `status` โดยตรงจาก
Client

------------------------------------------------------------------------

# 11. เอกสารและเลขที่เอกสาร

ระบบควรมี Document Sequence แยกตาม: - โรงเรียน - ประเภทเอกสาร -
ปีงบประมาณ - Prefix/รูปแบบเลขที่เอกสาร

ตัวอย่างประเภทเอกสาร: - `PO` --- ใบสั่งซื้อ/รายการจัดซื้อภายในระบบ - `RCV` ---
บันทึกการตรวจรับ - `ISS` --- ใบเบิกวัตถุดิบ - `FIN` --- รายการการเงิน - `APR`
--- รายการอนุมัติ (ถ้าจำเป็น)

ตัวอย่างรูปแบบ `PO-2569-000001` เป็นเพียงตัวอย่าง ไม่ใช่รูปแบบราชการที่รับรองแล้ว

การสร้างเลขต้องทำใน Transaction เพื่อไม่ให้เลขซ้ำเมื่อผู้ใช้หลายคนสร้างเอกสารพร้อมกัน

------------------------------------------------------------------------

# 12. Security, Privacy & Backup

## 12.1 Security

-   ใช้ HTTPS
-   Authentication ต้องมีการจัดการ Session ที่ปลอดภัย
-   ใช้ Least Privilege
-   บังคับ RLS/Server Authorization
-   ป้องกัน SQL Injection, XSS, CSRF ตามสถาปัตยกรรมที่เลือก
-   Validate Input ฝั่ง Server
-   จำกัดชนิดและขนาดไฟล์
-   Private Storage
-   ห้ามเปิดเผย Secret ใน Frontend/Repository
-   มี Rate Limiting สำหรับ Endpoint ที่เหมาะสม
-   เก็บ Audit Log สำหรับการกระทำสำคัญ

## 12.2 Backup & Recovery

เป้าหมายเบื้องต้นที่เสนอ: - RPO เป้าหมายไม่เกิน 24 ชั่วโมง - RTO เป้าหมายไม่เกิน 8
ชั่วโมง

ตัวเลขนี้เป็นเป้าหมายการออกแบบ ไม่ใช่คำรับประกันของผู้ให้บริการ
ต้องตรวจสอบตามแผนบริการจริง

ข้อกำหนด: - สำรองฐานข้อมูลตามรอบที่กำหนด - สำรองไฟล์หลักฐานและเอกสารด้วย - มีวิธี
Restore ที่เป็นเอกสาร - ทดสอบ Restore ในสภาพแวดล้อมแยก -
ระบุผู้รับผิดชอบและขั้นตอนเมื่อระบบขัดข้อง - ไม่ถือว่าการเปิดใช้ Backup
สำเร็จจนกว่าจะทดสอบกู้คืนได้จริง

------------------------------------------------------------------------

# 13. Acceptance Criteria / Test Plan

Antigravity ต้องสร้าง Test Plan และทดสอบตามกรณีอย่างน้อยต่อไปนี้

  -----------------------------------------------------------------------------------
  ID                      Test Case                     Expected Result
  ----------------------- ----------------------------- -----------------------------
  T-001                   ผู้ใช้ที่ไม่ Login เปิดหน้าระบบ       ไม่สามารถเข้าถึงข้อมูลภายใน

  T-002                   ผู้ใช้ไม่มี Permission เรียก API    ถูกปฏิเสธ
                          โดยตรง                        

  T-003                   ผู้ใช้จาก School อื่นเรียกข้อมูล      ถูกปฏิเสธ

  T-004                   สร้าง Meal Plan จำนวนผู้รับประทาน บันทึกได้และคำนวณตามจำนวน
                          90 คน                         

  T-005                   จำนวนผู้รับประทานเป็น 0 หรือติดลบ   Validation ปฏิเสธ

  T-006                   สูตรอาหารมีวัตถุดิบหลายหน่วย        คำนวณได้ถูกต้องตาม Conversion

  T-007                   แก้ Recipe หลัง Confirm Meal    Snapshot เดิมไม่เปลี่ยน
                          Plan                          

  T-008                   สร้าง PO จากรายการซื้อ           ยอดรวมถูกต้อง

  T-009                   ส่ง PO อนุมัติซ้ำ                  ไม่สร้าง Workflow ซ้ำ

  T-010                   ผู้สร้าง PO อนุมัติรายการตนเอง      ถูกปฏิเสธตามค่าเริ่มต้น

  T-011                   รับของบางส่วน                   PO เปลี่ยนเป็น Partially
                                                        Received

  T-012                   รับของหลายรอบ                  ยอดรับสะสมถูกต้อง

  T-013                   รับของเกินยอดสั่ง                 ถูกปฏิเสธหรือเข้า Exception
                                                        Approval ตามกฎ

  T-014                   ตรวจรับผ่านบางส่วน               เพิ่ม Stock เฉพาะจำนวนผ่าน

  T-015                   กด Confirm Receiving ซ้ำ       ไม่เพิ่ม Stock ซ้ำ

  T-016                   เบิกเกินยอดคงเหลือ               ถูกปฏิเสธตามค่าเริ่มต้น

  T-017                   Reversal Stock Movement       มีรายการกลับรายการและยอดถูกต้อง

  T-018                   Post ค่าใช้จ่าย                  รายงานการเงินสะท้อนยอดตามกฎ

  T-019                   ผู้ใช้ไม่มีสิทธิ์ดูเอกสารแนบ           เปิดไฟล์ไม่ได้

  T-020                   ผู้ใช้สองคนสร้างเลขเอกสารพร้อมกัน   เลขไม่ซ้ำ

  T-021                   อนุมัติ Workflow พร้อมกันสอง       มีเพียง Action ที่ถูกต้องรายการเดียว
                          Request                       

  T-022                   แก้ Workflow หลังมี Instance     Instance เดิมยังใช้ Version เดิม
                          เริ่มแล้ว                        

  T-023                   Export PDF/Excel              เนื้อหาและยอดตรงกับข้อมูลต้นทาง

  T-024                   Backup และ Restore            กู้คืนฐานข้อมูลและไฟล์ได้

  T-025                   เปิดหน้ารับของบนมือถือ             ฟอร์มใช้งานได้
                                                        ไม่มีการเลื่อนแนวนอนที่ไม่จำเป็น
  -----------------------------------------------------------------------------------

## 13.1 Quality Gates

ก่อนถือว่าแต่ละ Package เสร็จ: - Unit Tests ผ่าน - Integration Tests ผ่าน -
RLS/Authorization Tests ผ่าน - Migration ทดสอบกับฐานข้อมูลเปล่าได้ - ไม่มี Error
สำคัญใน Console/Server Log - ตรวจ Git Diff ว่าไม่มีไฟล์นอก Scope - ตรวจว่าไม่มี
Secret หรือข้อมูลจริงใน Repository - มีหลักฐานผลทดสอบที่ทำซ้ำได้

------------------------------------------------------------------------

# 14. Development Roadmap

พัฒนาเป็น Package เล็ก ๆ และตรวจรับทีละส่วน ห้ามสร้างทุก Module พร้อมกันโดยไม่ทดสอบ

## Package 1 --- Foundation & Security

-   Project structure
-   Database connection
-   Authentication
-   User Profile
-   School Membership
-   Roles/Permissions
-   RLS/Server Authorization
-   Audit foundation
-   Settings foundation

**Exit Gate:** Login, Permission, Data Isolation, Migration และ Audit
Tests ผ่าน

## Package 2 --- Menu & Recipe

-   Ingredient Categories
-   Units & Conversions
-   Ingredient Catalog
-   Supplier Catalog
-   Recipe CRUD + Version
-   Meal Plan
-   Daily diner count
-   Cost calculation
-   Snapshot

**Exit Gate:** คำนวณสูตรและต้นทุนได้ถูกต้อง Snapshot ไม่เปลี่ยนย้อนหลัง

## Package 3 --- Purchasing & Approval

-   Purchase Order
-   PO Items
-   Workflow Definitions/Versions
-   Approval Inbox
-   Approve/Reject/Return
-   Commitment integration

**Exit Gate:** ป้องกันอนุมัติซ้ำ Self-approval และ Commitment ถูกต้อง

## Package 4 --- Receiving & Inventory

-   Receiving Record
-   Inspection
-   Evidence Upload
-   Partial Receiving
-   Stock Ledger
-   Inventory Balance
-   Issue/Return/Reversal

**Exit Gate:** รับซ้ำไม่ได้ ยอดรับ/ยอดคลังถูกต้อง และ Ledger Reconcile ได้

## Package 5 --- Finance

-   Budget Allocation
-   Financial Categories
-   Transactions
-   Commitments
-   Payments
-   Financial Documents
-   Approval Integration

**Exit Gate:** ไม่มี Double Counting และยอดรายงานตรวจสอบย้อนกลับได้

## Package 6 --- Dashboard & Reports

-   Role-based Dashboard
-   Daily/Monthly Reports
-   Inventory Reports
-   Financial Reports
-   Approval Reports
-   PDF/Excel Export

**Exit Gate:** ตัวเลขตรงกับฐานข้อมูลและเอกสาร Export อ่านได้จริง

## Package 7 --- Production Readiness

-   Security Review
-   Performance Review
-   Backup/Restore Drill
-   Error Monitoring
-   User Acceptance Test
-   Deployment Checklist
-   User Guide

**Exit Gate:** ผู้ใช้จริงทดสอบผ่านและมีแผนกู้คืนระบบ

------------------------------------------------------------------------

# 15. ประเด็นที่ต้องยืนยันก่อน Production

Antigravity ต้องจัดทำรายการคำถาม/ทางเลือกให้ผู้ใช้ตัดสินใจ ห้ามสมมติว่าได้รับคำตอบแล้ว

1.  **หลักเกณฑ์การรับรู้ค่าใช้จ่าย:** รับรู้เมื่อสั่งซื้อ รับของ ตรวจรับ ได้รับใบเสร็จ
    หรือเมื่อชำระเงินจริง ต้องอิงระเบียบและแนวปฏิบัติของหน่วยงาน
2.  **เอกสารราชการ:** ต้องใช้แบบฟอร์มใด เลขที่เอกสาร รูปแบบลายเซ็น
    และข้อมูลบังคับใด
3.  **ผู้มีอำนาจอนุมัติ:** ตำแหน่ง/บุคคลจริง ลำดับอนุมัติ และวงเงินอนุมัติ
4.  **วิธีประเมินมูลค่าสต็อก:** แนะนำ Weighted Average สำหรับการประเมินต้นทุนภายใน
    หากจำเป็นต้องประเมินมูลค่าสต็อก แต่ต้องยืนยันก่อนใช้จริง
5.  **Snapshot:** ต้องตรึงข้อมูลใดบ้างใน Meal Plan, PO, Receiving และ Finance
6.  **การตรวจน้ำหนัก:** ต้องชั่งทุกวัตถุดิบหรือเฉพาะบางชนิด มีค่าคลาดเคลื่อนเท่าใด
7.  **การแปลงหน่วย:** วัตถุดิบใดต้องมี Density หรือ Conversion เฉพาะ
8.  **การเบิกวัตถุดิบ:** ต้องเบิกล่วงหน้าตามแผนหรือบันทึกตามใช้จริง
9.  **งบประมาณ:** แหล่งเงิน/หมวดงบ/ปีงบประมาณ และวิธีแยกภาระผูกพัน
10. **Backup:** ความถี่ พื้นที่จัดเก็บ ระยะเวลาเก็บ และผู้รับผิดชอบ
11. **เอกสารแนบ:** ชนิดไฟล์และขนาดสูงสุด
12. **การยกเลิก:** กฎการยกเลิก PO, Receiving, Stock Issue และ Financial
    Transaction หลังผ่านขั้นตอนต่าง ๆ

------------------------------------------------------------------------

# 16. ข้อกำหนดการทำงานสำหรับ Antigravity

## 16.1 ก่อนเริ่มพัฒนา

1.  อ่านเอกสารนี้ทั้งหมด
2.  ตรวจสอบ Repository ปัจจุบันและ Technology Stack ที่มีอยู่
3.  สรุป Architecture ที่มีอยู่ เทียบกับเอกสารนี้
4.  ทำ Gap Analysis แยกเป็น:
    -   ตรงตามข้อกำหนด
    -   ยังไม่มี
    -   ขัดแย้ง
    -   ต้องตัดสินใจ
5.  เสนอ Database ERD ที่ตรวจ FK, Unique, Check Constraint และ `school_id`
    ครบ
6.  เสนอแผน Migration และ Rollback
7.  ระบุค่าใช้จ่าย/ข้อจำกัดของบริการภายนอก ถ้ามี
8.  ระบุความเสี่ยงด้าน Security, Finance, Inventory และ Data Integrity
9.  ส่งแผน Package 1 พร้อม Acceptance Criteria ให้ผู้ใช้ตรวจสอบ

**ห้ามเริ่มแก้โค้ดหรือสร้าง/แก้ฐานข้อมูลจริงก่อนผู้ใช้อนุมัติแผนและ Scope**

## 16.2 ระหว่างพัฒนา

-   ทำทีละ Package
-   แก้เฉพาะ Scope ที่อนุมัติ
-   ห้ามเพิ่ม Feature เองโดยไม่แจ้ง
-   ห้ามใช้ Mock Data แทนการทดสอบ Integration โดยไม่ระบุชัด
-   ห้ามทำให้ข้อมูลจริงสูญหาย
-   ห้าม Reset/Drop Database หรือทำ Migration แบบทำลายข้อมูลโดยไม่มีอนุมัติ
-   ห้าม Commit, Push หรือ Deploy โดยไม่ได้รับอนุญาต
-   ห้ามใส่ Secret ลง Source Code
-   ทุก Business Rule ต้องมี Test
-   ทุกการเปลี่ยนแปลงต้องตรวจ Diff ก่อนรายงาน

## 16.3 รูปแบบรายงานหลังแต่ละ Package

รายงานเป็นหัวข้อ: 1. Scope ที่ทำ 2. ไฟล์ที่สร้าง/แก้ไข 3. Database
Changes/Migrations 4. Business Rules ที่ทำสำเร็จ 5. Tests ที่รัน พร้อมผลจริง 6.
Security/RLS Tests 7. Known Limitations 8. Git Diff Summary 9.
ความเสี่ยง/สิ่งที่ยังไม่เสร็จ 10. ขออนุมัติ Package ถัดไป

ห้ามรายงานว่า PASS หากยังไม่ได้รันทดสอบจริง

## 16.4 ข้อห้ามสำคัญ

-   ห้ามสร้างระบบ SaaS หลายโรงเรียนเต็มรูปแบบโดยไม่ได้รับอนุมัติ
-   ห้ามสร้างระบบบัญชี Double-entry เต็มรูปแบบใน MVP
-   ห้ามเพิ่ม AI/OCR/Automated Procurement ใน MVP
-   ห้ามสมมติว่ารายงานที่สร้างขึ้นเป็นแบบฟอร์มราชการที่ถูกต้องตามกฎหมาย
-   ห้ามใช้ Frontend เป็นจุดบังคับใช้ Permission เพียงอย่างเดียว
-   ห้ามแก้ Stock Balance โดยไม่มี Ledger
-   ห้ามแก้ธุรกรรมที่ Post แล้วโดยตรง
-   ห้ามทำลายข้อมูลหรือเปลี่ยนโครงสร้างฐานข้อมูลเดิมโดยไม่ตรวจสอบและขออนุมัติ

------------------------------------------------------------------------

# 17. Definition of Done --- ระบบพร้อมใช้งาน

ระบบจะถือว่าพร้อมใช้งานจริงเมื่อ: - ผู้ใช้แต่ละบทบาท Login และเห็นข้อมูลตามสิทธิ์ -
วางแผนอาหารและกำหนดจำนวนผู้รับประทานรายวันได้ - จัดการเมนู สูตรอาหาร และต้นทุนได้ -
สร้าง PO และอนุมัติตาม Workflow ได้ - รับของ ตรวจสอบคุณภาพ และรับบางส่วนได้ -
Stock In เฉพาะจำนวนที่ผ่านตรวจรับ - เบิกวัตถุดิบและตรวจสอบ Ledger ได้ -
บันทึกงบประมาณ ค่าใช้จ่าย ภาระผูกพัน และการชำระเงินได้ตามหลักเกณฑ์ที่ยืนยันแล้ว -
ออกรายงาน PDF/Excel ที่ตรวจสอบตัวเลขได้ - Audit ย้อนหลังได้ - RLS/Authorization
ผ่านการทดสอบ - Backup/Restore ผ่านการทดสอบจริง - ผู้ใช้โรงเรียนทดสอบ UAT ผ่าน -
มีคู่มือใช้งานและคู่มือกู้คืนระบบ

------------------------------------------------------------------------

# 18. คำสั่งเริ่มต้นสำหรับ Antigravity

ให้อ่านไฟล์ `SCHOOL_LUNCH_OS_MASTER_SPEC.md` ทั้งหมด และใช้เป็น Master
Specification ของโครงการ School Lunch OS

**งานแรกที่อนุญาต:** ทำ Read-only Repository Assessment และจัดทำ Gap
Analysis เท่านั้น

ให้ตรวจสอบ: 1. Technology Stack และโครงสร้าง Repository ปัจจุบัน 2.
ส่วนที่มีอยู่แล้วเทียบกับข้อกำหนด 3. Database ERD ที่เสนอ พร้อม PK/FK/Unique/Check
Constraints 4. ความถูกต้องของ `school_id` และ Data Isolation 5.
ความเสี่ยงของ Inventory Ledger, Finance, Approval Workflow และ File
Storage 6. รายการคำถามที่ต้องให้เจ้าของระบบตัดสินใจ 7. แผนพัฒนา Package 1 ที่มี
Scope ชัดเจนและ Acceptance Tests

**ห้ามเขียนโค้ด ห้ามแก้ไฟล์ ห้ามสร้าง Migration ห้ามสร้าง/แก้ฐานข้อมูล ห้ามติดตั้ง
Dependency ห้ามเชื่อมต่อบริการภายนอก ห้าม Commit/Push/Deploy
จนกว่าจะได้รับอนุมัติอย่างชัดเจน**

เมื่อส่งผล Assessment แล้ว ให้หยุดรอการอนุมัติ

------------------------------------------------------------------------

## End of Master Specification
