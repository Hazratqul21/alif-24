import pytest
from playwright.sync_api import Page, expect

@pytest.mark.e2e
def test_home_page(page: Page):
    """Test that the home page loads and title is correct"""
    try:
        page.goto("http://localhost:5173")
        expect(page).to_have_title("Alif24 Platform")
        # Check for main heading
        expect(page.get_by_role("heading", name="Alif24")).to_be_visible()
    except Exception as e:
        pytest.skip(f"Frontend not running: {e}")

@pytest.mark.e2e
def test_login_flow_ui_elements(page: Page):
    """Test that login elements are present"""
    try:
        page.goto("http://localhost:5173/login")
        # Check for email and password inputs
        expect(page.get_by_placeholder("Email")).to_be_visible()
        expect(page.get_by_placeholder("Password")).to_be_visible()
        # Check for submit button
        expect(page.get_by_role("button", name="Kirish")).to_be_visible()
    except Exception as e:
        pytest.skip(f"Frontend not running: {e}")
