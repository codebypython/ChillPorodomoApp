/**
 * XLSXParser - Parse Excel files for schedule data
 * Uses XLSX library loaded from CDN
 */

// XLSX is loaded globally via script tag
const XLSX = window.XLSX;

export class XLSXParser {
    /**
     * Parse class schedule file (XLSX)
     * Expected structure:
     * - Row 1: Headers (TT, Mã lớp học phần, Tên lớp học phần, Số TC, Tích hợp, CLC, Giảng viên, Thời khóa biểu, Tuần học)
     * - Row 2+: Data rows
     */
    async parseClassScheduleFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Validate structure
                    if (!this.validateClassScheduleStructure(worksheet)) {
                        reject(new Error('Cấu trúc file không đúng. Vui lòng kiểm tra lại file Excel.'));
                        return;
                    }
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: ''
                    });
                    
                    // Parse data
                    const courses = this.parseClassScheduleData(jsonData);
                    
                    resolve(courses);
                } catch (error) {
                    console.error('Error parsing XLSX file:', error);
                    reject(new Error('Không thể đọc file Excel. Vui lòng kiểm tra lại file.'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Không thể đọc file.'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Validate file structure
     */
    validateClassScheduleStructure(worksheet) {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
        });
        
        if (jsonData.length < 2) return false;
        
        const headers = jsonData[0];
        const requiredHeaders = [
            'TT', 'Mã lớp học phần', 'Tên lớp học phần', 
            'Số TC', 'Tích hợp', 'CLC', 'Giảng viên', 
            'Thời khóa biểu', 'Tuần học'
        ];
        
        // Check if headers contain required fields (case-insensitive, flexible)
        const headerText = headers.join(' ').toLowerCase();
        const hasRequiredFields = requiredHeaders.some(header => 
            headerText.includes(header.toLowerCase())
        );
        
        return hasRequiredFields;
    }

    /**
     * Parse class schedule data from JSON array
     */
    parseClassScheduleData(jsonData) {
        if (jsonData.length < 2) return [];
        
        const headers = jsonData[0];
        const courses = [];
        
        // Find column indices
        const colIndices = {
            tt: this.findColumnIndex(headers, ['TT', 'tt', 'Thứ tự']),
            code: this.findColumnIndex(headers, ['Mã lớp học phần', 'Mã lớp', 'Code']),
            name: this.findColumnIndex(headers, ['Tên lớp học phần', 'Tên lớp', 'Name']),
            credits: this.findColumnIndex(headers, ['Số TC', 'TC', 'Credits', 'Tín chỉ']),
            integration: this.findColumnIndex(headers, ['Tích hợp', 'Integration']),
            clc: this.findColumnIndex(headers, ['CLC', 'clc']),
            instructor: this.findColumnIndex(headers, ['Giảng viên', 'Instructor', 'GV']),
            schedule: this.findColumnIndex(headers, ['Thời khóa biểu', 'Schedule', 'Lịch học']),
            weeks: this.findColumnIndex(headers, ['Tuần học', 'Weeks', 'Tuần'])
        };
        
        // Parse data rows
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                continue;
            }
            
            const course = {
                tt: this.getCellValue(row, colIndices.tt),
                code: this.getCellValue(row, colIndices.code),
                name: this.getCellValue(row, colIndices.name),
                credits: this.getCellValue(row, colIndices.credits),
                integration: this.getCellValue(row, colIndices.integration),
                clc: this.getCellValue(row, colIndices.clc),
                instructor: this.getCellValue(row, colIndices.instructor),
                schedule: this.getCellValue(row, colIndices.schedule),
                weeks: this.getCellValue(row, colIndices.weeks)
            };
            
            // Only add if has essential data
            if (course.name || course.code) {
                courses.push(course);
            }
        }
        
        return courses;
    }

    /**
     * Find column index by header name (flexible matching)
     */
    findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            const header = String(headers[i] || '').trim();
            for (const name of possibleNames) {
                if (header.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(header.toLowerCase())) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * Get cell value safely
     */
    getCellValue(row, index) {
        if (index === -1 || !row || index >= row.length) return '';
        const value = row[index];
        return value !== null && value !== undefined ? String(value).trim() : '';
    }
}

