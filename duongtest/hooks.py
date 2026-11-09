app_name = "duongtest"
app_title = "Duongtest"
app_publisher = "Duong Nguyen"
app_description = "test"
app_email = "nguyenquangduong04122005@gmail.com"
app_license = "mit"

before_install = "duongtest.permissions.ensure_security_roles"
before_migrate = ["duongtest.permissions.ensure_security_roles"]

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "duongtest",
# 		"logo": "/assets/duongtest/logo.png",
# 		"title": "Duongtest",
# 		"route": "/duongtest",
# 		"has_permission": "duongtest.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/duongtest/css/duongtest.css"
# app_include_js = "/assets/duongtest/js/duongtest.js"

# include js, css files in header of web template
# web_include_css = "/assets/duongtest/css/duongtest.css"
# web_include_js = "/assets/duongtest/js/duongtest.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "duongtest/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "duongtest/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "duongtest.utils.jinja_methods",
# 	"filters": "duongtest.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "duongtest.install.before_install"
# after_install = "duongtest.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "duongtest.uninstall.before_uninstall"
# after_uninstall = "duongtest.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "duongtest.utils.before_app_install"
# after_app_install = "duongtest.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "duongtest.utils.before_app_uninstall"
# after_app_uninstall = "duongtest.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "duongtest.build.after_build"

# To hook into the build process of other apps
# The list of apps being built is passed as an argument

# after_app_build = "duongtest.build.after_app_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "duongtest.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["duongtest.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }
permission_query_conditions = {
	"Interview Feedback": "duongtest.permissions.get_interview_feedback_permission_query",
	"Job Applicant": "duongtest.permissions.get_job_applicant_permission_query",
	"Interview": "duongtest.permissions.get_interview_permission_query",
}

has_permission = {
	"Interview Feedback": "duongtest.permissions.has_sensitive_record_permission",
	"Job Applicant": "duongtest.permissions.has_sensitive_record_permission",
	"Interview": "duongtest.permissions.has_sensitive_record_permission",
	"File": "duongtest.permissions.has_sensitive_record_permission",
}

override_doctype_class = {
	"File": "duongtest.overrides.SecureFile",
}

after_migrate = ["duongtest.permissions.secure_existing_cv_files"]

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"duongtest.tasks.all"
# 	],
# 	"daily": [
# 		"duongtest.tasks.daily"
# 	],
# 	"hourly": [
# 		"duongtest.tasks.hourly"
# 	],
# 	"weekly": [
# 		"duongtest.tasks.weekly"
# 	],
# 	"monthly": [
# 		"duongtest.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "duongtest.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "duongtest.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "duongtest.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["duongtest.utils.before_request"]
# after_request = ["duongtest.utils.after_request"]

# Job Events
# ----------
# before_job = ["duongtest.utils.before_job"]
# after_job = ["duongtest.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"duongtest.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
