# ChillPomodoro

ChillPomodoro la ung dung Pomodoro + planner hoc tap chay thuần tren browser bang ES modules. App hien co timer, preset, background media, lich hoc import Excel, lich sinh hoat, task planner, smart focus, study analytics va workout planning bodyweight theo huong muscle-focused.

## Chay local

Mo `index.html` bang Live Server hoac mot static file server bat ky.

## Test

```bash
npm test
```

Bo test hien tai bao ve cac luong quan trong:

- Timer persistence va resume runtime state
- Import/parse lich hoc
- Tao va doc lich sinh hoat
- Luu/tai preset multi-track
- Planner analytics va focus session
- Seed workout library, tao workout program tu template va workout analytics

## Kien truc chinh

- `index.html`: entry va toan bo layout tab
- `js/main.js`: app bootstrap, event wiring, planner/focus/stats orchestration
- `js/classes/StorageManager.js`: localStorage + IndexedDB
- `js/classes/PomodoroTimer.js`: timer logic, persistence, timer events
- `js/classes/ScheduleManager.js`: parse/import lich hoc
- `js/classes/DailyActivityManager.js`: lich sinh hoat, truy van theo index
- `js/classes/TaskPlannerManager.js`: task planning, goals, focus analytics
- `js/controllers/ScheduleController.js`: render va event delegation cho schedule views
- `js/classes/WorkoutManager.js`: seed exercise library, create template-based workout programs, session completion va analytics
- `js/controllers/WorkoutController.js`: render va event wiring cho workout workspace
- `js/utils/WorkoutRenderer.js`: workout cards, session detail, analytics rendering
- `js/services/NotificationService.js`: toast notification dung chung
- `js/utils/TimeUtils.js`: helper thoi gian dung chung

## Dinh dang file Excel

App doc cac cot theo form xuat thong thuong cua lich hoc:

- `TT`
- `Mã lớp học phần`
- `Tên lớp học phần`
- `Số TC`
- `Giảng viên`
- `Thời khóa biểu`
- `Tuần học`

Vi du truong `Thời khóa biểu`:

- `Thứ 4,1-2,E2.403`
- `Thứ 4,1-2,E2.403; Thứ 5,6-7,A141`

## Manual Regression Checklist

- Timer start, pause, reset, skip va resume sau reload
- Them/xoa animation, sound, preset
- Chon background va multi-track music tu header dropdown
- Import lich hoc tu file Excel va xem bang lich tuan
- Tao lich sinh hoat, cap nhat complete/skip activity, xem lich hom nay
- Tao task planner, gan task vao focus session, xem analytics trong tab Stats
- Mo `Schedules > Lich Tap Luyen`, tao workout program tu template va kiem tra buoi tap duoc sinh ra
- Gan workout session vao daily schedule, mark complete/skip va kiem tra Stats cap nhat workout adherence/progression

## Workout Workflow

- Vao `Schedules > Lich Tap Luyen` de tao program theo template `UpperLower4Day`, `PushLegsCore3Day` hoac `FullBodyDensity3Day`
- App seed san exercise library strict no-equipment, co tempo, rep target, rest, progression/regression va safety cue
- Recommendation engine uu tien ngay con nhieu free time, tranh chen them buoi tap vao ngay da co daily schedule qua day
- Workout session co the duoc chen vao daily schedule va dong bo lai khi user mark `completed` hoac `skipped`
- Tab `Stats` tong hop workout adherence, top muscle volume va goi y progression/recovery
