# Asset and Ticket Variables Documentation

This document provides a comprehensive list of all variables and fields found in the asset management system and Cherwell ticketing system based on the screenshots analysis.

## Asset Management Variables

### Core Asset Identification
- **Asset Tag** - Unique identifier for physical assets
- **Asset Status** - Current status of the asset in the system
- **In Use** - Boolean field indicating if asset is currently in use

### Asset Details
- **AssetOwner** - Person or department responsible for the asset
- **Barcode** - Barcode identifier for asset tracking
- **Building** - Physical location building identifier
- **BusinessName** - Business entity associated with the asset

### Technical Specifications
- **BIOS Version** - System BIOS version
- **BIOS Date** - Date of BIOS installation/update
- **Operating System** - OS installed on the asset
- **Operating System Service Pack** - Service pack version
- **Owned By Email** - Email of asset owner
- **Owned By Event** - Event that triggered ownership
- **Override** - Override field for special cases
- **Override CSP** - Override for CSP settings

### Network and Connectivity
- **Friendly Name** - Human-readable name for the asset
- **Hardware ID** - Hardware identifier
- **HostName** - Network hostname
- **ICCID** - Integrated Circuit Card Identifier
- **IMEI** - International Mobile Equipment Identity
- **IP Address** - Network IP address
- **IPAddress 6** - IPv6 address

### Customer and Location
- **Created By** - User who created the asset record
- **Created Culture** - Culture/locale of creation
- **Created Date Time** - Timestamp of creation
- **Created Timezone** - Timezone of creation
- **Customer Type Name** - Type of customer
- **Customer IT** - Customer IT department
- **Department** - Department assignment
- **Division ID** - Division identifier
- **DivisionName** - Division name

### Employee and User Information
- **Email** - Primary email address
- **Employee Status** - Current employment status
- **Employee Number** - Employee identification number
- **Facebook Url** - Social media profile
- **Fax Name** - Fax identifier
- **First name** - User's first name
- **Full name** - User's complete name

### Status and Lifecycle
- **In Use** - Asset utilization status
- **Initial Response Time** - Time for initial response
- **Initial Response Time Units** - Units for response time
- **Last Modified By** - Last user to modify
- **Last Modified Date Time** - Last modification timestamp
- **MaximumFeedbackUnits** - Maximum feedback time units
- **NextFeedback** - Next feedback due date

### Service Management
- **Service** - Associated service
- **Service Blackout End Date Time** - End of service blackout
- **Service Blackout Start Date Time** - Start of service blackout
- **Service Calendar Name** - Service calendar reference
- **Service Emergency** - Emergency service flag
- **Service SLA** - Service Level Agreement
- **Status Order** - Order status
- **Subcategory** - Asset subcategory
- **Support Reviewer** - Support review assignment
- **Tab Visibility** - UI tab visibility settings

### Urgency and Priority
- **Urgency** - Urgency level
- **Visible to Self/Service** - Visibility settings
- **WorkAroundOrTip** - Workaround information

### Additional Fields
- **MobileID** - Mobile device identifier
- **Name prefix** - Name prefix (Mr., Mrs., etc.)
- **Name suffix** - Name suffix (Jr., Sr., etc.)
- **Work Hours** - Working hours assignment
- **Priority Group** - Priority grouping
- **Score** - Asset score/rating
- **Subhead/SubBillot** - Sub-billing information

## Cherwell Ticket Variables

### Ticket Identification
- **Incident** - Incident ticket identifier
- **Type** - Ticket type classification

### Dates and Times
- **Created Date Time** - Ticket creation timestamp
- **Critical Date** - Critical deadline
- **Cubicle Room** - Physical location
- **Current Alert 1** - First alert status
- **Current Date 1** - First date field
- **Current Date 2** - Second date field
- **Current Date 3** - Third date field
- **Custom Dropdown 2** - Custom dropdown field

### Templates and Display
- **temp_Disp_upd'd** - Display update template
- **temp_District_upd** - District update template
- **temp_Caps_upd** - Caps update template
- **temp_Emp_upd** - Employee update template
- **temp_Facility_upd** - Facility update template
- **temp_Model_upd** - Model update template
- **temp_Phone_upd** - Phone update template
- **temp_status_changed** - Status change template

## Relationship Between Assets and Tickets

The system appears to maintain relationships between assets and tickets through:
- Asset Tag references in tickets
- Employee Number linking
- Hardware ID associations
- IP Address tracking
- Building/Location data

## Column Customization Options

The interface shows customizable columns that can be configured for different views:
- Fields can be selected/deselected for display
- Custom ordering is available
- Different views for Assets vs Incidents/Requests

## Usage Notes

1. Many fields appear to be optional or conditional based on asset type
2. The system supports both IPv4 and IPv6 addressing
3. Multiple date formats and timezone support is built-in
4. Template fields suggest automated workflows for updates
5. The system maintains comprehensive audit trails through Created/Modified fields