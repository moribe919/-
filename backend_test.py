#!/usr/bin/env python3
import requests
import json
import time
import os
import sys

# Get the backend URL from the frontend .env file
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=')[1].strip('"\'')
    raise Exception("Could not find REACT_APP_BACKEND_URL in frontend/.env")

# Base URL for API requests
BASE_URL = f"{get_backend_url()}/api"
print(f"Using backend URL: {BASE_URL}")

# Test data
test_resident = {"name": "Test Resident"}
test_item = {
    "name": "Test Item",
    "quantity": 10,
    "min": 5,
    "source": "購入"
}

# Store IDs for created resources
resident_id = None
item_id = None

# Helper function to print test results
def print_test_result(test_name, success, response=None, error=None):
    if success:
        print(f"✅ {test_name}: PASSED")
        if response:
            print(f"   Response: {json.dumps(response, indent=2)}")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"   Error: {error}")
        if response:
            print(f"   Response: {json.dumps(response, indent=2)}")
    print("-" * 80)

# Helper function to make API requests with error handling
def make_request(method, endpoint, data=None, params=None):
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, params=params)
        elif method == "POST":
            response = requests.post(url, json=data, params=params)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json() if response.text else None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                return e.response.json()
            except:
                return e.response.text
        return str(e)

# Test 1: Root endpoint
def test_root():
    print("\n🔍 Testing Root Endpoint")
    response = make_request("GET", "/")
    success = isinstance(response, dict) and "message" in response
    print_test_result("Root Endpoint", success, response)
    return success

# Test 2: Status check endpoints
def test_status_endpoints():
    print("\n🔍 Testing Status Check Endpoints")
    
    # Test GET /api/status
    get_response = make_request("GET", "/status")
    get_success = isinstance(get_response, list)
    print_test_result("GET /status", get_success, get_response)
    
    # Test POST /api/status
    post_data = {"client_name": "Test Client"}
    post_response = make_request("POST", "/status", post_data)
    post_success = isinstance(post_response, dict) and "id" in post_response and post_response["client_name"] == post_data["client_name"]
    print_test_result("POST /status", post_success, post_response)
    
    return get_success and post_success

# Test 3: Resident endpoints
def test_resident_endpoints():
    print("\n🔍 Testing Resident Endpoints")
    global resident_id
    
    # Test GET /api/residents (initial)
    initial_residents = make_request("GET", "/residents")
    get_initial_success = isinstance(initial_residents, list)
    print_test_result("GET /residents (initial)", get_initial_success, initial_residents)
    
    # Test POST /api/residents
    post_response = make_request("POST", "/residents", test_resident)
    post_success = isinstance(post_response, dict) and "id" in post_response and post_response["name"] == test_resident["name"]
    print_test_result("POST /residents", post_success, post_response)
    
    if post_success:
        resident_id = post_response["id"]
        
        # Test GET /api/residents (after creation)
        updated_residents = make_request("GET", "/residents")
        get_updated_success = isinstance(updated_residents, list) and len(updated_residents) > len(initial_residents)
        print_test_result("GET /residents (after creation)", get_updated_success, updated_residents)
        
        # Test PUT /api/residents/{resident_id}
        update_data = {"name": "Updated Resident Name"}
        put_response = make_request("PUT", f"/residents/{resident_id}", update_data)
        put_success = isinstance(put_response, dict) and put_response["name"] == update_data["name"]
        print_test_result(f"PUT /residents/{resident_id}", put_success, put_response)
        
        return get_initial_success and post_success and get_updated_success and put_success
    
    return False

# Test 4: Item endpoints
def test_item_endpoints():
    print("\n🔍 Testing Item Endpoints")
    global item_id, resident_id
    
    if not resident_id:
        print("❌ Cannot test item endpoints: No resident ID available")
        return False
    
    # Add resident ID to test item
    test_item["residentId"] = resident_id
    
    # Test GET /api/items (initial)
    initial_items = make_request("GET", "/items")
    get_initial_success = isinstance(initial_items, list)
    print_test_result("GET /items (initial)", get_initial_success, initial_items)
    
    # Test POST /api/items
    post_response = make_request("POST", "/items", test_item)
    post_success = isinstance(post_response, dict) and "id" in post_response and post_response["name"] == test_item["name"]
    print_test_result("POST /items", post_success, post_response)
    
    if post_success:
        item_id = post_response["id"]
        
        # Test GET /api/items (after creation)
        updated_items = make_request("GET", "/items")
        get_updated_success = isinstance(updated_items, list) and len(updated_items) > len(initial_items)
        print_test_result("GET /items (after creation)", get_updated_success, updated_items)
        
        # Test GET /api/items?resident_id={id}
        filtered_items = make_request("GET", "/items", params={"resident_id": resident_id})
        filter_success = isinstance(filtered_items, list) and len(filtered_items) > 0 and all(item["residentId"] == resident_id for item in filtered_items)
        print_test_result(f"GET /items?resident_id={resident_id}", filter_success, filtered_items)
        
        # Test PUT /api/items/{item_id}
        update_data = {"name": "Updated Item Name", "min": 8}
        put_response = make_request("PUT", f"/items/{item_id}", update_data)
        put_success = isinstance(put_response, dict) and put_response["name"] == update_data["name"] and put_response["min"] == update_data["min"]
        print_test_result(f"PUT /items/{item_id}", put_success, put_response)
        
        return get_initial_success and post_success and get_updated_success and filter_success and put_success
    
    return False

# Test 5: Purchase tracking
def test_purchase_tracking():
    print("\n🔍 Testing Purchase Tracking")
    global item_id
    
    if not item_id:
        print("❌ Cannot test purchase tracking: No item ID available")
        return False
    
    # Get initial item state
    initial_item = make_request("GET", f"/items", params={"resident_id": resident_id})
    if not isinstance(initial_item, list) or len(initial_item) == 0:
        print("❌ Cannot test purchase tracking: Failed to get initial item state")
        return False
    
    initial_item = next((item for item in initial_item if item["id"] == item_id), None)
    if not initial_item:
        print("❌ Cannot test purchase tracking: Item not found")
        return False
    
    initial_quantity = initial_item["quantity"]
    
    # Test POST /api/items/{item_id}/purchase
    purchase_data = {"qty": 5, "price": 100.0}
    purchase_response = make_request("POST", f"/items/{item_id}/purchase", purchase_data)
    
    purchase_success = (
        isinstance(purchase_response, dict) and 
        purchase_response["quantity"] == initial_quantity + purchase_data["qty"] and
        len(purchase_response["purchases"]) > 0
    )
    
    print_test_result(f"POST /items/{item_id}/purchase", purchase_success, purchase_response)
    return purchase_success

# Test 6: Usage tracking
def test_usage_tracking():
    print("\n🔍 Testing Usage Tracking")
    global item_id
    
    if not item_id:
        print("❌ Cannot test usage tracking: No item ID available")
        return False
    
    # Get current item state
    current_item = make_request("GET", f"/items", params={"resident_id": resident_id})
    if not isinstance(current_item, list) or len(current_item) == 0:
        print("❌ Cannot test usage tracking: Failed to get current item state")
        return False
    
    current_item = next((item for item in current_item if item["id"] == item_id), None)
    if not current_item:
        print("❌ Cannot test usage tracking: Item not found")
        return False
    
    initial_quantity = current_item["quantity"]
    initial_used = current_item["used"]
    
    # Test POST /api/items/{item_id}/usage
    usage_data = {"qty": 2}
    usage_response = make_request("POST", f"/items/{item_id}/usage", usage_data)
    
    usage_success = (
        isinstance(usage_response, dict) and 
        usage_response["quantity"] == initial_quantity - usage_data["qty"] and
        usage_response["used"] == initial_used + usage_data["qty"] and
        len(usage_response["usageHistory"]) > 0
    )
    
    print_test_result(f"POST /items/{item_id}/usage", usage_success, usage_response)
    
    # Test error case: insufficient stock
    large_usage = {"qty": 1000}  # Intentionally large to trigger error
    error_response = make_request("POST", f"/items/{item_id}/usage", large_usage)
    
    error_success = not isinstance(error_response, dict) or "detail" in error_response
    print_test_result(f"POST /items/{item_id}/usage (insufficient stock)", error_success, error_response)
    
    return usage_success and error_success

# Test 7: Quantity adjustment
def test_quantity_adjustment():
    print("\n🔍 Testing Quantity Adjustment")
    global item_id
    
    if not item_id:
        print("❌ Cannot test quantity adjustment: No item ID available")
        return False
    
    # Get current item state
    current_item = make_request("GET", f"/items", params={"resident_id": resident_id})
    if not isinstance(current_item, list) or len(current_item) == 0:
        print("❌ Cannot test quantity adjustment: Failed to get current item state")
        return False
    
    current_item = next((item for item in current_item if item["id"] == item_id), None)
    if not current_item:
        print("❌ Cannot test quantity adjustment: Item not found")
        return False
    
    initial_quantity = current_item["quantity"]
    
    # Test POST /api/items/{item_id}/adjust-quantity?delta=3
    delta = 3
    adjust_response = make_request("POST", f"/items/{item_id}/adjust-quantity", params={"delta": delta})
    
    adjust_success = (
        isinstance(adjust_response, dict) and 
        adjust_response["quantity"] == initial_quantity + delta
    )
    
    print_test_result(f"POST /items/{item_id}/adjust-quantity?delta={delta}", adjust_success, adjust_response)
    
    # Test negative adjustment
    negative_delta = -2
    neg_adjust_response = make_request("POST", f"/items/{item_id}/adjust-quantity", params={"delta": negative_delta})
    
    neg_adjust_success = (
        isinstance(neg_adjust_response, dict) and 
        neg_adjust_response["quantity"] == initial_quantity + delta + negative_delta
    )
    
    print_test_result(f"POST /items/{item_id}/adjust-quantity?delta={negative_delta}", neg_adjust_success, neg_adjust_response)
    
    return adjust_success and neg_adjust_success

# Test 8: Delete operations
def test_delete_operations():
    print("\n🔍 Testing Delete Operations")
    global item_id, resident_id
    
    # Test DELETE /api/items/{item_id}
    if item_id:
        delete_item_response = make_request("DELETE", f"/items/{item_id}")
        delete_item_success = isinstance(delete_item_response, dict) and "message" in delete_item_response
        print_test_result(f"DELETE /items/{item_id}", delete_item_success, delete_item_response)
        
        # Verify item is deleted
        items = make_request("GET", "/items", params={"resident_id": resident_id})
        verify_item_deleted = isinstance(items, list) and not any(item["id"] == item_id for item in items)
        print_test_result("Verify item deletion", verify_item_deleted, items)
        
        item_id = None
    else:
        delete_item_success = False
        verify_item_deleted = False
        print("❌ Cannot test item deletion: No item ID available")
    
    # Create a new item to test resident deletion cascade
    if resident_id:
        new_item_data = {
            "residentId": resident_id,
            "name": "Item to be deleted with resident",
            "quantity": 5,
            "min": 2,
            "source": "購入"
        }
        new_item = make_request("POST", "/items", new_item_data)
        create_new_item_success = isinstance(new_item, dict) and "id" in new_item
        print_test_result("Create item for cascade delete test", create_new_item_success, new_item)
        
        # Test DELETE /api/residents/{resident_id}
        delete_resident_response = make_request("DELETE", f"/residents/{resident_id}")
        delete_resident_success = isinstance(delete_resident_response, dict) and "message" in delete_resident_response
        print_test_result(f"DELETE /residents/{resident_id}", delete_resident_success, delete_resident_response)
        
        # Verify resident is deleted
        residents = make_request("GET", "/residents")
        verify_resident_deleted = isinstance(residents, list) and not any(resident["id"] == resident_id for resident in residents)
        print_test_result("Verify resident deletion", verify_resident_deleted, residents)
        
        # Verify cascade deletion of items
        items = make_request("GET", "/items")
        verify_cascade_deletion = isinstance(items, list) and not any(item["residentId"] == resident_id for item in items)
        print_test_result("Verify cascade deletion of items", verify_cascade_deletion, items)
        
        resident_id = None
    else:
        create_new_item_success = False
        delete_resident_success = False
        verify_resident_deleted = False
        verify_cascade_deletion = False
        print("❌ Cannot test resident deletion: No resident ID available")
    
    return (delete_item_success and verify_item_deleted and 
            create_new_item_success and delete_resident_success and 
            verify_resident_deleted and verify_cascade_deletion)

# Run all tests
def run_all_tests():
    print("\n" + "=" * 80)
    print("🧪 INVENTORY MANAGEMENT SYSTEM API TESTS")
    print("=" * 80)
    
    tests = [
        ("Root Endpoint", test_root),
        ("Status Check Endpoints", test_status_endpoints),
        ("Resident Endpoints", test_resident_endpoints),
        ("Item Endpoints", test_item_endpoints),
        ("Purchase Tracking", test_purchase_tracking),
        ("Usage Tracking", test_usage_tracking),
        ("Quantity Adjustment", test_quantity_adjustment),
        ("Delete Operations", test_delete_operations)
    ]
    
    results = {}
    all_passed = True
    
    for name, test_func in tests:
        print("\n" + "=" * 80)
        print(f"🧪 RUNNING TEST: {name}")
        print("=" * 80)
        
        try:
            result = test_func()
            results[name] = result
            if not result:
                all_passed = False
        except Exception as e:
            print(f"❌ Test {name} failed with exception: {str(e)}")
            results[name] = False
            all_passed = False
    
    print("\n" + "=" * 80)
    print("🧪 TEST SUMMARY")
    print("=" * 80)
    
    for name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {name}")
    
    print("\n" + "=" * 80)
    if all_passed:
        print("🎉 ALL TESTS PASSED! The Inventory Management System API is working correctly.")
    else:
        print("❌ SOME TESTS FAILED. Please check the logs above for details.")
    print("=" * 80)
    
    return all_passed

if __name__ == "__main__":
    run_all_tests()
