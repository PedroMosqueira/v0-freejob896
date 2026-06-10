import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupProposals() {
  console.log('🧹 Starting proposal cleanup...\n');

  try {
    // 1. Remove proposals with invalid type (not interest_only)
    console.log('📋 Step 1: Removing non-interest proposals...');
    const { data: invalidProposals, error: invalidError } = await supabase
      .from('need_proposals')
      .select('id, type')
      .neq('type', 'interest_only');

    if (invalidError) {
      console.error('❌ Error fetching invalid proposals:', invalidError);
    } else {
      console.log(`   Found ${invalidProposals?.length || 0} non-interest proposals`);
    }

    // 2. Fix cancelled proposals without cancelled_at timestamp
    console.log('\n📋 Step 2: Fixing cancelled proposals without timestamp...');
    const { error: cancelError } = await supabase
      .from('need_proposals')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('status', 'cancelled')
      .is('cancelled_at', null);

    if (cancelError) {
      console.error('❌ Error updating cancelled proposals:', cancelError);
    } else {
      console.log('   ✅ Updated cancelled proposals without timestamp');
    }

    // 3. Release old cancelled proposals (older than 2 hours)
    console.log('\n📋 Step 3: Auto-releasing old cancelled proposals...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: oldCancelled, error: oldError } = await supabase
      .from('need_proposals')
      .select('id')
      .eq('status', 'cancelled')
      .lt('cancelled_at', twoHoursAgo)
      .eq('type', 'interest_only');

    if (oldError) {
      console.error('❌ Error fetching old cancelled proposals:', oldError);
    } else {
      console.log(`   Found ${oldCancelled?.length || 0} old cancelled proposals to release`);
      
      if (oldCancelled && oldCancelled.length > 0) {
        const { error: releaseError } = await supabase
          .from('need_proposals')
          .update({ status: 'released' })
          .in('id', oldCancelled.map(p => p.id));

        if (releaseError) {
          console.error('❌ Error releasing proposals:', releaseError);
        } else {
          console.log(`   ✅ Released ${oldCancelled.length} proposals`);
        }
      }
    }

    // 4. Get current interest count per professional
    console.log('\n📋 Step 4: Current active interests per professional...');
    const { data: activeProposals, error: countError } = await supabase
      .from('need_proposals')
      .select('professional_email, status')
      .eq('type', 'interest_only')
      .not('status', 'in', '(completed,cancelled,released)');

    if (countError) {
      console.error('❌ Error counting active proposals:', countError);
    } else {
      const counts = {};
      activeProposals?.forEach(p => {
        counts[p.professional_email] = (counts[p.professional_email] || 0) + 1;
      });

      console.log('\n📊 Active interests by professional:');
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([email, count]) => {
          console.log(`   ${email}: ${count} active`);
        });
    }

    // 5. Validate data structure
    console.log('\n📋 Step 5: Validating data structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('need_proposals')
      .select('*')
      .eq('type', 'interest_only')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error fetching sample:', sampleError);
    } else if (sample && sample.length > 0) {
      console.log('   Sample proposal structure:');
      const proposal = sample[0];
      console.log(`   - id: ${proposal.id}`);
      console.log(`   - type: ${proposal.type}`);
      console.log(`   - status: ${proposal.status}`);
      console.log(`   - professional_email: ${proposal.professional_email}`);
      console.log(`   - cancelled_at: ${proposal.cancelled_at}`);
      console.log(`   - viewed_by_requester_at: ${proposal.viewed_by_requester_at}`);
    }

    console.log('\n✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

cleanupProposals();
