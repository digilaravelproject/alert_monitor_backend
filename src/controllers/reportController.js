const reportRepository = require('../repositories/reportRepository');
const comityRepository = require('../repositories/comityRepository');
const userRepository = require('../repositories/userRepository');
const PDFDocument = require('pdfkit');

class ReportController {
    async handleOverviewOrPdf(req, res) {
        try {
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            
            let adminId = null;
            let locationId = null;
            let isActiveComityMember = true;

            if (isSuperAdmin) {
                // No restrictions
            } else if (isAdmin) {
                adminId = req.user.id;
            } else {
                // Non-admin / Staff check comity active status
                const isActive = await comityRepository.isUserActiveComityMember(req.user.id);
                if (!isActive) {
                    isActiveComityMember = false;
                }
                const userProfile = await userRepository.getProfile(req.user.id, req.user.role);
                if (userProfile && userProfile.location_id) {
                    locationId = userProfile.location_id;
                }
            }

            const { pdf } = req.query;

            // 1. If pdf=true requested, generate and return the PDF file
            if (pdf === 'true') {
                if (!isActiveComityMember) {
                    return res.status(403).json({
                        status: false,
                        error: 'Forbidden: Access denied. Active comity membership required.'
                    });
                }

                const alerts = await reportRepository.getFilteredAlerts(adminId, isSuperAdmin, locationId, req.query);

                // Create PDF using pdfkit
                const doc = new PDFDocument({ margin: 40 });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="sensor_alert_sheet.pdf"');
                
                doc.pipe(res);

                // PDF styling & Header Banner
                doc.fillColor('#e65100').fontSize(24).text('SOS SAFETY SYSTEM', { align: 'center', wordSpacing: 2 });
                doc.fillColor('#37474f').fontSize(14).text('Security Incident & Sensor Alert Sheet', { align: 'center' });
                doc.moveDown(0.5);
                
                // Metadata
                doc.fillColor('#546e7a').fontSize(9).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
                doc.text(`User Profile: ${req.user.role} (${req.user.phone_number || 'N/A'})`, { align: 'right' });
                doc.moveDown(1);

                // Horizontal line separator
                doc.strokeColor('#cfd8dc').lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
                doc.moveDown(1);

                // Active Filters
                doc.fillColor('#263238').fontSize(12).text('Report Filters Applied:', { underline: true });
                doc.fontSize(10).fillColor('#37474f');
                doc.text(`- Sensor Type: ${req.query.type || 'All Sensors'}`);
                if (req.query.location_id) doc.text(`- Location ID: ${req.query.location_id}`);
                doc.text(`- Date Range: ${req.query.start_date || 'Earliest'} to ${req.query.end_date || 'Latest'}`);
                doc.text(`- Alert Status: ${req.query.status || 'All Statuses'}`);
                doc.moveDown(1.5);

                // Summary Stats Box
                doc.fillColor('#263238').fontSize(12).text('Summary Metrics:', { underline: true });
                doc.moveDown(0.5);

                let fireCount = 0, gunshotCount = 0, crowdCount = 0, doneCount = 0;
                alerts.forEach(a => {
                    if (a.status === 'ACKNOWLEDGED') {
                        doneCount++;
                    } else if (a.status === 'DISMISSED') {
                        // Exclude dismissed from counts, or count separately. We keep standard:
                    } else {
                        const typeLower = (a.device.type || '').toLowerCase();
                        const evLower = (a.ev || '').toLowerCase();
                        if (typeLower === 'fire detector' || evLower.includes('fire')) fireCount++;
                        else if (typeLower === 'gunshot sensor' || evLower.includes('gunshot')) gunshotCount++;
                        else if (typeLower === 'crowd monitor' || evLower.includes('crowd')) crowdCount++;
                    }
                });

                // Draw Stats Grid
                const startY = doc.y;
                doc.rect(40, startY, 120, 45).fill('#ffebee');
                doc.rect(170, startY, 120, 45).fill('#ede7f6');
                doc.rect(300, startY, 120, 45).fill('#e8eaf6');
                doc.rect(430, startY, 142, 45).fill('#e8f5e9');

                doc.fillColor('#c62828').fontSize(10).text('FIRE', 50, startY + 8);
                doc.fontSize(16).text(String(fireCount), 50, startY + 20);

                doc.fillColor('#4527a0').fontSize(10).text('GUNSHOT', 180, startY + 8);
                doc.fontSize(16).text(String(gunshotCount), 180, startY + 20);

                doc.fillColor('#1565c0').fontSize(10).text('CROWD', 310, startY + 8);
                doc.fontSize(16).text(String(crowdCount), 310, startY + 20);

                doc.fillColor('#2e7d32').fontSize(10).text('DONE (ACKNOWLEDGED)', 440, startY + 8);
                doc.fontSize(16).text(String(doneCount), 440, startY + 20);

                doc.y = startY + 60;
                doc.moveDown(1);

                // Alert Log Details
                doc.fillColor('#263238').fontSize(12).text(`Detailed Incidents Log (Total matching: ${alerts.length})`, { underline: true });
                doc.moveDown(0.5);

                if (alerts.length === 0) {
                    doc.fontSize(10).fillColor('#78909c').text('No alerts matched the specified criteria.');
                } else {
                    // Header of Table
                    const tableHeaderY = doc.y;
                    doc.rect(40, tableHeaderY, 532, 20).fill('#cfd8dc');
                    doc.fillColor('#37474f').fontSize(9);
                    doc.text('ID', 45, tableHeaderY + 6);
                    doc.text('Date & Time', 80, tableHeaderY + 6);
                    doc.text('Event Type', 180, tableHeaderY + 6);
                    doc.text('Device & Location', 280, tableHeaderY + 6);
                    doc.text('Message', 430, tableHeaderY + 6);
                    doc.text('Status', 515, tableHeaderY + 6);
                    doc.y = tableHeaderY + 20;

                    alerts.forEach((alert, index) => {
                        // Check page overflow
                        if (doc.y > 700) {
                            doc.addPage();
                            // Re-draw table headers on new page
                            const newHeaderY = doc.y;
                            doc.rect(40, newHeaderY, 532, 20).fill('#cfd8dc');
                            doc.fillColor('#37474f').fontSize(9);
                            doc.text('ID', 45, newHeaderY + 6);
                            doc.text('Date & Time', 80, newHeaderY + 6);
                            doc.text('Event Type', 180, newHeaderY + 6);
                            doc.text('Device & Location', 280, newHeaderY + 6);
                            doc.text('Message', 430, newHeaderY + 6);
                            doc.text('Status', 515, newHeaderY + 6);
                            doc.y = newHeaderY + 20;
                        }

                        const currentY = doc.y;
                        
                        // Alternate row backgrounds
                        if (index % 2 === 1) {
                            doc.rect(40, currentY, 532, 25).fill('#f5f7f8');
                        }

                        doc.fillColor('#37474f').fontSize(8.5);
                        
                        // ID
                        doc.text(String(alert.id), 45, currentY + 8);
                        
                        // Date
                        const dateStr = new Date(alert.insert_date).toLocaleString();
                        doc.text(dateStr, 80, currentY + 8);
                        
                        // Event Type
                        doc.text(String(alert.ev).toUpperCase(), 180, currentY + 8);
                        
                        // Device & Location
                        const devName = alert.device.name || `Node: ${alert.device.serial_number}`;
                        const locName = alert.device.location.name || 'N/A';
                        doc.text(`${devName} (${locName})`, 280, currentY + 8, { width: 140 });
                        
                        // Message
                        doc.text(alert.msg || 'N/A', 430, currentY + 8, { width: 80 });
                        
                        // Status
                        doc.text(alert.status, 515, currentY + 8);

                        doc.y = currentY + 25;
                    });
                }

                doc.end();
                return;
            }

            // 2. Otherwise return the overview data (counts + weekly trends + report PDF links)
            if (!isActiveComityMember) {
                return res.status(200).json({
                    status: true,
                    counts: { fire: 0, gunshot: 0, crowd: 0, done: 0 },
                    weekly_trends: { trend_percentage: 0, trends: [] },
                    reports: []
                });
            }

            // Fetch counts
            const countsAlerts = await reportRepository.getAlertsForCounts(adminId, isSuperAdmin, locationId);
            let fireCount = 0, gunshotCount = 0, crowdCount = 0, doneCount = 0;

            countsAlerts.forEach(row => {
                if (row.is_acknowledged === 1) {
                    doneCount++;
                } else {
                    const typeLower = (row.type || '').toLowerCase();
                    const evLower = (row.ev || '').toLowerCase();
                    
                    if (typeLower === 'fire detector' || evLower.includes('fire')) {
                        fireCount++;
                    } else if (typeLower === 'gunshot sensor' || evLower.includes('gunshot')) {
                        gunshotCount++;
                    } else if (typeLower === 'crowd monitor' || evLower.includes('crowd')) {
                        crowdCount++;
                    }
                }
            });

            // Fetch trends
            const trendsAlerts = await reportRepository.getAlertsForTrends(adminId, isSuperAdmin, locationId);
            const trends = [];
            const now = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                trends.push({
                    dateString: dateStr,
                    day: dayLabel,
                    count: 0
                });
            }

            let currentWeekCount = 0;
            let previousWeekCount = 0;
            const currentWeekStart = new Date(trends[0].dateString + 'T00:00:00Z');
            
            trendsAlerts.forEach(alert => {
                const alertDate = new Date(alert.Insertdate);
                const matchingDay = trends.find(t => {
                    const tDate = new Date(t.dateString);
                    return alertDate.getUTCFullYear() === tDate.getUTCFullYear() &&
                           alertDate.getUTCMonth() === tDate.getUTCMonth() &&
                           alertDate.getUTCDate() === tDate.getUTCDate();
                });

                if (matchingDay) {
                    matchingDay.count++;
                    currentWeekCount++;
                } else if (alertDate >= new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000) && alertDate < currentWeekStart) {
                    previousWeekCount++;
                }
            });

            let trendPercentage = 0;
            if (previousWeekCount === 0) {
                trendPercentage = currentWeekCount > 0 ? 100 : 0;
            } else {
                trendPercentage = Math.round(((currentWeekCount - previousWeekCount) / previousWeekCount) * 100);
            }

            const trendsResponse = trends.map(t => ({
                day: t.day,
                count: t.count
            }));

            // Generated date formatted nicely like "March 13, 2024"
            const generatedDateFormatted = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            // Generate report PDF links (Screenshot 2)
            const reports = [
                {
                    title: 'Weekly Fire Alert Report',
                    description: `Generated on ${generatedDateFormatted}`,
                    pdf_link: `/api/reports?pdf=true&type=Fire%20Detector`
                },
                {
                    title: 'Weekly Gunshot Detected Report',
                    description: `Generated on ${generatedDateFormatted}`,
                    pdf_link: `/api/reports?pdf=true&type=Gunshot%20Sensor`
                },
                {
                    title: 'Weekly Crowd Forming Report',
                    description: `Generated on ${generatedDateFormatted}`,
                    pdf_link: `/api/reports?pdf=true&type=Crowd%20Monitor`
                },
                {
                    title: 'Weekly Intrusion Alert Report',
                    description: `Generated on ${generatedDateFormatted}`,
                    pdf_link: `/api/reports?pdf=true&type=Presence%20Radar`
                }
            ];

            return res.status(200).json({
                status: true,
                counts: {
                    fire: fireCount,
                    gunshot: gunshotCount,
                    crowd: crowdCount,
                    done: doneCount
                },
                weekly_trends: {
                    trend_percentage: trendPercentage,
                    trends: trendsResponse
                },
                reports
            });

        } catch (error) {
            console.error('Error in handleOverviewOrPdf:', error);
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async filterReport(req, res) {
        try {
            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';
            
            let adminId = null;
            let locationId = null;

            if (isSuperAdmin) {
                // No restrictions
            } else if (isAdmin) {
                adminId = req.user.id;
            } else {
                // Non-admin / Staff check comity active status
                const isActive = await comityRepository.isUserActiveComityMember(req.user.id);
                if (!isActive) {
                    return res.status(200).json({
                        status: true,
                        total: 0,
                        page: parseInt(req.query.page, 10) || 1,
                        limit: parseInt(req.query.limit, 10) || 10,
                        data: []
                    });
                }
                const userProfile = await userRepository.getProfile(req.user.id, req.user.role);
                if (userProfile && userProfile.location_id) {
                    locationId = userProfile.location_id;
                }
            }

            const alerts = await reportRepository.getFilteredAlerts(adminId, isSuperAdmin, locationId, req.query);

            const total = alerts.length;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const offset = (page - 1) * limit;

            const paginatedData = alerts.slice(offset, offset + limit);

            return res.status(200).json({
                status: true,
                total,
                page,
                limit,
                data: paginatedData
            });

        } catch (error) {
            console.error('Error in filterReport:', error);
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new ReportController();
